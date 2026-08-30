import { recordAiCall } from "@/lib/db/ai-call";
import { type AiConfig } from "./config";
import { choisirFournisseur, sdkFor, type PontFournisseur } from "./fournisseurs";
import { lireLaConfigEffective } from "./reglages-effectifs";
import { provenanceDeLAppel, reserverLesDeuxPlaces } from "./reservation";
import {
  AICallFailedError,
  AIDisabledError,
  AIMissingOutputError,
  AITruncatedOutputError,
  AiError,
} from "./errors";
import { loadFixture } from "./fixtures";
import { lireSortieStructuree } from "./lecture";
import { flattenText, type AiMessage } from "./message";
import { toOutputSchema } from "./output-schema";
import { computeCostUsd } from "./pricing";
import type { AiContract } from "./schemas";
import { signalerUneBascule } from "./signalement-de-bascule";

/**
 * Le seul point d'entrée vers le modèle. C'est lui qui protège le budget.
 *
 * Les appels réseau vivent dans `fournisseurs/` — un pont par lignée, derrière
 * une interface commune. Ici, on résout le pont depuis la config, on garde les
 * garde-fous (interrupteur, mode mock, réservation), et on écrit au registre —
 * succès comme échec. Aucun retry.
 *
 * **Repli automatique.** Quand le pont primaire est OpenRouter et qu'il tombe
 * (réseau, 5xx, sortie invalide ou tronquée), Sonnet Anthropic natif prend le
 * relais — mêmes prompts, même schéma, deux campagnes ont validé qu'ils
 * tiennent le même contrat. La bascule est marquée dans `AiCall.basculee`, et
 * au-delà de cinq bascules par jour, une alerte part par email.
 */

const MOCK_LATENCY_MS = 300;

/**
 * Le modèle du repli — Sonnet natif, la ligne de fond éprouvée.
 *
 * Il est nommé ici et non lu dans `AI_MODEL` : le repli parle à Anthropic en
 * direct, et `AI_MODEL` porte un identifiant OpenRouter dès que le primaire
 * n'est pas Anthropic.
 */
const MODELE_ANTHROPIC = "claude-sonnet-5";

/** Codes d'erreur qui déclenchent un repli. Le reste (quota, config, disabled) remonte. */
const CODES_DE_REPLI = new Set([
  "AI_CALL_FAILED",
  "AI_NO_OUTPUT",
  "AI_INVALID_OUTPUT",
  "AI_TRUNCATED",
]);

export type CallAIParams<T> = {
  contract: AiContract<T>;
  system: string;
  messages: AiMessage[];
  maxTokens?: number;
  /**
   * Le modèle, quand il ne doit pas être celui de la configuration.
   *
   * Ajouté pour les juges du banc, qui sont des décisions locales et binaires :
   * les faire tourner sur le modèle d'extraction coûterait dix fois plus pour
   * la même réponse. Le modèle retenu part au registre `AiCall` et au rapport —
   * un verdict ne veut rien dire si l'on ignore qui l'a rendu.
   *
   * N'en fais pas un réglage de confort. Le produit garde `AI_MODEL` : deux
   * chemins d'ingestion sur deux modèles différents rendraient les mesures
   * incomparables, ce qui est exactement ce que ce banc existe pour éviter.
   *
   * **Coupe aussi le repli automatique** : une surcharge de modèle par
   * l'appelant est une décision locale, on ne veut pas la voir remise en
   * silence sur Sonnet.
   */
  model?: string;
  userId?: string;
  jobId?: string;
  /**
   * L'appel sert un visiteur sans compte.
   *
   * Déclaré et non déduit de l'absence d'`userId` : celle-ci couvre aussi les
   * reprises par le cron et les outils internes, qui n'ont personne derrière et
   * ne doivent pas puiser dans la part du public.
   */
  anonyme?: boolean;
};

/** Ré-export : `batch.ts` en a besoin sans importer le paquet. */
export { sdkFor };

/**
 * Émet une seule fois via le pont donné et journalise dans `AiCall`.
 *
 * `basculee` marque la ligne quand ce pont sert de repli — l'appel initial a
 * échoué, celui-ci est la seconde tentative sur Sonnet. Utilisé par `emit`.
 */
async function emettreEtJournaliser<T>(
  pont: PontFournisseur,
  params: CallAIParams<T>,
  config: AiConfig,
  basculee: boolean,
): Promise<T> {
  const { contract } = params;
  const maxTokens = params.maxTokens ?? config.maxTokens;
  const ledger = {
    purpose: contract.purpose,
    model: config.model,
    fournisseur: config.fournisseur,
    userId: params.userId ?? null,
    jobId: params.jobId ?? null,
    basculee,
  };
  // Dérivé avant d'ouvrir le registre : une forme intraduisible est une erreur
  // de développement, pas un appel raté.
  const format = toOutputSchema(contract.forme);

  const startedAt = Date.now();
  let sortie;
  try {
    sortie = await pont.emettre({
      model: config.model,
      maxTokens,
      system: params.system,
      messages: params.messages,
      formatSchema: format,
      purpose: contract.purpose,
    });
  } catch (erreur) {
    await recordAiCall({
      ...ledger,
      inputTokens: 0,
      outputTokens: 0,
      costUsd: "0",
      latencyMs: Date.now() - startedAt,
      success: false,
      errorCode: erreur instanceof AiError ? erreur.code : "AI_CALL_FAILED",
    });
    if (erreur instanceof AICallFailedError) throw erreur;
    throw new AICallFailedError(contract.purpose, erreur);
  }

  const costUsd = computeCostUsd(config.model, sortie.consommation);

  try {
    // Une réponse coupée porte une sortie incomplète mais parfois valide :
    // huit concepts demandés, cinq rendus, aucune erreur. C'est un échec.
    if (sortie.finishReason === "length") {
      throw new AITruncatedOutputError(contract.purpose, maxTokens);
    }
    if (sortie.responseText.length === 0) {
      throw new AIMissingOutputError(contract.purpose);
    }

    const value = lireSortieStructuree(contract, sortie.responseText);
    await recordAiCall({
      ...ledger,
      ...sortie.consommation,
      costUsd,
      latencyMs: sortie.latencyMs,
      success: true,
    });
    return value;
  } catch (error) {
    await recordAiCall({
      ...ledger,
      ...sortie.consommation,
      costUsd,
      latencyMs: sortie.latencyMs,
      success: false,
      errorCode: error instanceof AiError ? error.code : "AI_UNKNOWN",
    });
    throw error;
  }
}

/** Décide si l'échec du pont primaire doit basculer sur Sonnet. */
function doitBasculer<T>(erreur: unknown, config: AiConfig, params: CallAIParams<T>): boolean {
  // Rien à quoi basculer si le pont primaire est déjà Anthropic natif.
  if (config.fournisseur !== "openrouter") return false;
  // Une surcharge de modèle vient d'un appelant qui cible un modèle précis
  // (les juges du banc). Le remettre en silence sur Sonnet fausserait la
  // mesure et casserait le contrat de `CallAIParams.model`.
  if (params.model !== undefined) return false;
  if (!(erreur instanceof AiError)) return false;
  return CODES_DE_REPLI.has(erreur.code);
}

function motifDeBascule(erreur: unknown): string {
  if (!(erreur instanceof Error)) return String(erreur);
  const cause = erreur.cause instanceof Error ? ` — cause : ${erreur.cause.message}` : "";
  return `${erreur.message}${cause}`;
}

async function emit<T>(params: CallAIParams<T>, config: AiConfig): Promise<T> {
  const cles = { anthropicApiKey: config.apiKey, openrouterApiKey: config.openrouterApiKey };
  const pontPrimaire = choisirFournisseur(config.fournisseur, cles);

  try {
    return await emettreEtJournaliser(pontPrimaire, params, config, false);
  } catch (erreur) {
    if (!doitBasculer(erreur, config, params)) throw erreur;
    // Bascule : Sonnet Anthropic natif reprend, mêmes prompts, même schéma.
    // Pas de retry du côté du repli — si Anthropic échoue aussi, l'erreur
    // remonte à l'appelant.
    const pontRepli = choisirFournisseur("anthropic", cles);
    const configRepli: AiConfig = {
      ...config,
      fournisseur: "anthropic",
      model: MODELE_ANTHROPIC,
    };
    const resultat = await emettreEtJournaliser(pontRepli, params, configRepli, true);
    signalerUneBascule(motifDeBascule(erreur));
    return resultat;
  }
}

/**
 * Appelle le modèle et rend une valeur déjà validée. Dans l'ordre :
 * interrupteur, mode mock, part du compte, plafond journalier, émission avec
 * `max_tokens` explicite et sortie contrainte par grammaire, refus d'une
 * réponse tronquée, validation stricte, puis écriture au registre — succès
 * comme échec. Aucun retry sur le même pont ; bascule automatique de Luna
 * vers Sonnet quand Luna tombe (voir `emit`).
 */
export async function callAI<T>(params: CallAIParams<T>): Promise<T> {
  const effective = await lireLaConfigEffective();
  // La surcharge est appliquée ici, avant tout le reste : le registre, le calcul
  // de coût et la réservation doivent tous voir le modèle réellement appelé.
  const config = params.model ? { ...effective, model: params.model } : effective;

  if (!config.enabled) {
    throw new AIDisabledError();
  }

  if (config.mock) {
    await new Promise((resolve) => setTimeout(resolve, MOCK_LATENCY_MS));
    return loadFixture(params.contract, flattenText(params.messages));
  }

  // Les places sont réservées avant d'émettre, chacune en une seule instruction :
  // deux appels simultanés ne peuvent pas obtenir la même.
  await reserverLesDeuxPlaces(config, provenanceDeLAppel(params));

  return emit(params, config);
}
