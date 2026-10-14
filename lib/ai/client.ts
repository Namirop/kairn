import { enregistrerLAppel } from "@/lib/db/registre-des-appels";
import { type ConfigIa } from "./config";
import { choisirFournisseur, type Fournisseur, type PontFournisseur } from "./fournisseurs";
import { lireLaConfigEffective } from "./reglages-effectifs";
import { provenanceDeLAppel, reserverLaPlaceDuRepli, reserverLesDeuxPlaces } from "./reservation";
import {
  EmissionEchoueeError,
  AppelsCoupesError,
  SortieAbsenteError,
  SortieTronqueeError,
  AppelModeleError,
} from "./errors";
import { chargerLaFixture } from "./fixtures";
import { lireSortieStructuree } from "./lecture";
import { texteMisBoutABout, type MessageIa } from "./message";
import { deriverLeSchemaDeSortie } from "./schema-de-sortie";
import { coutEnDollars } from "./cout-des-appels";
import type { ContratDeSortie } from "./schemas";
import { signalerUneBascule } from "./signalement-de-bascule";

/**
 * Le seul point d'entrée vers le modèle. C'est lui qui protège le budget.
 *
 * Les appels réseau vivent dans `fournisseurs/`. Ici : garde-fous
 * (interrupteur, mock, réservation), registre `AiCall` succès comme échec, et
 * aucun retry.
 *
 * Quand l'appel tombe — réseau, 5xx, sortie invalide ou tronquée —, Sonnet
 * prend le relais sur le même pont, mêmes prompts, même schéma. La bascule est
 * marquée dans `AiCall.basculee` et alerte au-delà de `SEUIL_BASCULES` par jour.
 *
 * Le repli reste chez le fournisseur primaire : une panne d'OpenRouter lui-même
 * n'est pas couverte, pas plus que celles de l'hébergeur ou de la base, et un
 * second compte payé pour ce seul cas achèterait la redondance où elle est
 * facile, pas où elle sert. Le pont Anthropic reste câblé pour une bascule
 * manuelle par variable d'environnement.
 */

const LATENCE_DU_MOCK_MS = 300;

/**
 * Le modèle du repli. Deux entrées pour un seul modèle : OpenRouter veut le nom
 * préfixé, le SDK d'Anthropic le nom court. `AI_MODEL` porte le primaire.
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

export type ParametresDAppel<T> = {
  contract: ContratDeSortie<T>;
  system: string;
  messages: MessageIa[];
  maxTokens?: number;
  /**
   * Le modèle, quand il ne doit pas être celui de la configuration : les juges
   * du banc, des décisions binaires qui coûteraient dix fois plus sur le modèle
   * d'extraction.
   *
   * Pas un réglage de confort : le produit garde `AI_MODEL`, sinon deux chemins
   * d'ingestion sur deux modèles rendraient les mesures incomparables. Coupe
   * aussi le repli automatique (voir `doitBasculer`).
   */
  model?: string;
  userId?: string;
  jobId?: string;
  /**
   * L'appel sert un visiteur sans compte. Déclaré et non déduit de l'absence
   * d'`userId`, qui couvre aussi le cron et les outils internes : ceux-là ne
   * doivent pas puiser dans la part du public.
   */
  anonyme?: boolean;
};

/**
 * Émet une seule fois via le pont donné et journalise dans `AiCall`.
 * `basculee` marque la ligne de l'émission de repli.
 */
async function emettreEtJournaliser<T>(
  pont: PontFournisseur,
  params: ParametresDAppel<T>,
  config: ConfigIa,
  basculee: boolean,
): Promise<T> {
  const { contract } = params;
  const maxTokens = params.maxTokens ?? config.maxTokens;
  const registre = {
    purpose: contract.purpose,
    model: config.model,
    fournisseur: config.fournisseur,
    userId: params.userId ?? null,
    jobId: params.jobId ?? null,
    basculee,
  };
  // Dérivé avant d'ouvrir le registre : une forme intraduisible est une erreur
  // de développement, pas un appel raté.
  const format = deriverLeSchemaDeSortie(contract.forme);

  const debut = Date.now();
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
    await enregistrerLAppel({
      ...registre,
      inputTokens: 0,
      outputTokens: 0,
      costUsd: "0",
      latencyMs: Date.now() - debut,
      success: false,
      errorCode: erreur instanceof AppelModeleError ? erreur.code : "AI_CALL_FAILED",
    });
    if (erreur instanceof EmissionEchoueeError) throw erreur;
    throw new EmissionEchoueeError(contract.purpose, erreur);
  }

  const cout = coutEnDollars(config.model, sortie.consommation);

  try {
    // Une réponse coupée peut rester valide au schéma (cinq concepts sur
    // huit) : c'est un échec quand même.
    if (sortie.finishReason === "length") {
      throw new SortieTronqueeError(contract.purpose, maxTokens);
    }
    if (sortie.responseText.length === 0) {
      throw new SortieAbsenteError(contract.purpose);
    }

    const valeur = lireSortieStructuree(contract, sortie.responseText);
    await enregistrerLAppel({
      ...registre,
      ...sortie.consommation,
      costUsd: cout,
      latencyMs: sortie.latencyMs,
      success: true,
    });
    return valeur;
  } catch (echec) {
    await enregistrerLAppel({
      ...registre,
      ...sortie.consommation,
      costUsd: cout,
      latencyMs: sortie.latencyMs,
      success: false,
      errorCode: echec instanceof AppelModeleError ? echec.code : "AI_UNKNOWN",
    });
    throw echec;
  }
}

/** Décide si l'échec de l'appel doit basculer sur le modèle de repli. */
function doitBasculer<T>(erreur: unknown, config: ConfigIa, params: ParametresDAppel<T>): boolean {
  // Primaire déjà sur le modèle de repli : rejouer l'appel serait le retry que
  // ce fichier s'interdit.
  if (config.model === MODELE_DE_REPLI[config.fournisseur]) return false;
  // Un appelant qui cible un modèle précis (les juges du banc) ne doit pas être
  // remis en silence sur Sonnet : la mesure serait faussée.
  if (params.model !== undefined) return false;
  if (!(erreur instanceof AppelModeleError)) return false;
  return CODES_DE_REPLI.has(erreur.code);
}

function motifDeBascule(erreur: unknown): string {
  if (!(erreur instanceof Error)) return String(erreur);
  const cause = erreur.cause instanceof Error ? ` — cause : ${erreur.cause.message}` : "";
  return `${erreur.message}${cause}`;
}

async function emettreAvecRepli<T>(params: ParametresDAppel<T>, config: ConfigIa): Promise<T> {
  const cles = { anthropicApiKey: config.apiKey, openrouterApiKey: config.openrouterApiKey };
  const pont = choisirFournisseur(config.fournisseur, cles);

  try {
    return await emettreEtJournaliser(pont, params, config, false);
  } catch (erreur) {
    if (!doitBasculer(erreur, config, params)) throw erreur;
    // Le repli est une seconde émission réelle : il prend sa place au plafond
    // global, sinon une panne du primaire doublerait les émissions sous le même
    // plafond. Plafond atteint, l'échec du primaire remonte.
    if (!(await reserverLaPlaceDuRepli(config))) throw erreur;
    // Si le repli échoue aussi, l'erreur remonte : pas de troisième tentative.
    const configRepli: ConfigIa = { ...config, model: MODELE_DE_REPLI[config.fournisseur] };
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
 * comme échec. Aucun retry ; un seul repli vers Sonnet (voir `emettreAvecRepli`).
 */
export async function callAI<T>(params: ParametresDAppel<T>): Promise<T> {
  const effective = await lireLaConfigEffective();
  // La surcharge est appliquée ici, avant tout le reste : le registre, le calcul
  // de coût et la réservation doivent tous voir le modèle réellement appelé.
  const config = params.model ? { ...effective, model: params.model } : effective;

  if (!config.enabled) {
    throw new AppelsCoupesError();
  }

  if (config.mock) {
    await new Promise((resolve) => setTimeout(resolve, LATENCE_DU_MOCK_MS));
    return chargerLaFixture(params.contract, texteMisBoutABout(params.messages), params.system);
  }

  // Les places sont réservées avant d'émettre, chacune en une seule instruction :
  // deux appels simultanés ne peuvent pas obtenir la même.
  await reserverLesDeuxPlaces(config, provenanceDeLAppel(params));

  return emettreAvecRepli(params, config);
}
