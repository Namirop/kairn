import { recordAiCall } from "@/lib/db/ai-call";
import { type AiConfig } from "./config";
import { choisirFournisseur, type Fournisseur, type PontFournisseur } from "./fournisseurs";
import { lireLaConfigEffective } from "./reglages-effectifs";
import { provenanceDeLAppel, reserverLaPlaceDuRepli, reserverLesDeuxPlaces } from "./reservation";
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
 * **Repli automatique.** Quand l'appel tombe — réseau, 5xx, sortie invalide ou
 * tronquée —, Sonnet prend le relais : mêmes prompts, même schéma, deux
 * campagnes ont validé qu'ils tiennent le même contrat. La bascule est marquée
 * dans `AiCall.basculee`, et au-delà de cinq bascules par jour, une alerte part
 * par email.
 *
 * **Le repli reste chez le fournisseur primaire**, sur un second modèle. Il
 * passait par Anthropic en direct, ce qui obligeait à financer un second compte
 * pour une dépense presque nulle. Ce que ce repli-là couvrait en plus — une
 * panne d'OpenRouter lui-même — n'est pas couvert autrement dans ce projet :
 * l'hébergeur et la base n'ont pas de second fournisseur non plus, et payer une
 * redondance ici pendant qu'elle manque là serait acheter l'assurance où elle
 * est facile, pas où elle sert. Le pont Anthropic reste dans le code : une
 * variable d'environnement suffit à basculer dessus le jour où il le faudrait.
 */

const MOCK_LATENCY_MS = 300;

/**
 * Le modèle du repli, par fournisseur — Sonnet des deux côtés, la ligne de fond
 * éprouvée.
 *
 * Deux entrées pour un seul modèle, parce que l'identifiant dépend de la route :
 * OpenRouter veut le nom préfixé, le SDK d'Anthropic le nom court. Il est nommé
 * ici et non lu dans `AI_MODEL`, qui porte le modèle primaire.
 */
export const MODELE_DE_REPLI: Record<Fournisseur, string> = {
  openrouter: "anthropic/claude-sonnet-5",
  anthropic: "claude-sonnet-5",
};

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

/** Décide si l'échec de l'appel doit basculer sur le modèle de repli. */
function doitBasculer<T>(erreur: unknown, config: AiConfig, params: CallAIParams<T>): boolean {
  // Rien à quoi basculer si le primaire est déjà le modèle de repli : le même
  // appel une seconde fois n'est pas un repli, c'est le retry que ce fichier
  // s'interdit.
  if (config.model === MODELE_DE_REPLI[config.fournisseur]) return false;
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
  const pont = choisirFournisseur(config.fournisseur, cles);

  try {
    return await emettreEtJournaliser(pont, params, config, false);
  } catch (erreur) {
    if (!doitBasculer(erreur, config, params)) throw erreur;
    // Le repli est une seconde émission réelle : il prend sa place au plafond
    // global, sinon une panne du primaire doublerait les émissions sous le même
    // plafond. Plafond atteint, pas de repli : l'échec du primaire remonte.
    if (!(await reserverLaPlaceDuRepli(config))) throw erreur;
    // Bascule : Sonnet reprend sur le même pont, mêmes prompts, même schéma.
    // Pas de retry derrière — si le repli échoue aussi, l'erreur remonte à
    // l'appelant.
    const configRepli: AiConfig = { ...config, model: MODELE_DE_REPLI[config.fournisseur] };
    const resultat = await emettreEtJournaliser(pont, params, configRepli, true);
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
    return loadFixture(params.contract, flattenText(params.messages), params.system);
  }

  // Les places sont réservées avant d'émettre, chacune en une seule instruction :
  // deux appels simultanés ne peuvent pas obtenir la même.
  await reserverLesDeuxPlaces(config, provenanceDeLAppel(params));

  return emit(params, config);
}
