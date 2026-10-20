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
 * Le seul point d'entrée vers le modèle, celui qui protège le budget : garde-fous,
 * registre `AiCall` succès comme échec, aucun retry. Le réseau vit dans `fournisseurs/`.
 *
 * Un appel tombé (réseau, 5xx, sortie invalide ou tronquée) bascule une fois sur
 * Sonnet, même pont, mêmes prompts, marqué `AiCall.basculee`. Le repli reste chez
 * le fournisseur primaire : une panne d'OpenRouter lui-même n'est pas couverte, un
 * second compte payé n'achèterait la redondance que là où elle est facile.
 */

const LATENCE_DU_MOCK_MS = 300;

/** Un seul modèle : OpenRouter veut le nom préfixé, le SDK d'Anthropic le nom court. */
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
   * Réservé aux juges du banc (décisions binaires, dix fois moins chères ailleurs).
   * Le produit garde `AI_MODEL`, sinon ses mesures deviendraient incomparables.
   * Coupe le repli (voir `doitBasculer`).
   */
  model?: string;
  userId?: string;
  jobId?: string;
  /**
   * Visiteur sans compte. Déclaré, pas déduit d'un `userId` absent : le cron et
   * les outils internes n'en ont pas non plus et ne puisent pas dans cette part.
   */
  anonyme?: boolean;
};

/** Une seule émission, journalisée dans `AiCall`. */
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
    // Coupée, une réponse peut rester valide au schéma (cinq concepts sur huit).
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

function doitBasculer<T>(erreur: unknown, config: ConfigIa, params: ParametresDAppel<T>): boolean {
  // Primaire déjà sur Sonnet : rejouer serait le retry interdit.
  if (config.model === MODELE_DE_REPLI[config.fournisseur]) return false;
  // Un modèle ciblé (juges du banc) remis sur Sonnet fausserait la mesure.
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
    // Seconde émission réelle : elle prend sa place au plafond global, sinon une
    // panne du primaire doublerait les émissions sous le même plafond.
    if (!(await reserverLaPlaceDuRepli(config))) throw erreur;
    // Repli en échec : l'erreur remonte, pas de troisième tentative.
    const configRepli: ConfigIa = { ...config, model: MODELE_DE_REPLI[config.fournisseur] };
    const resultat = await emettreEtJournaliser(pont, params, configRepli, true);
    signalerUneBascule(motifDeBascule(erreur));
    return resultat;
  }
}

/**
 * Rend une valeur validée. Dans l'ordre : interrupteur, mock, part du compte,
 * plafond journalier, émission (`max_tokens` explicite, sortie contrainte par
 * schéma), refus d'une troncature, validation, registre. Aucun retry.
 */
export async function callAI<T>(params: ParametresDAppel<T>): Promise<T> {
  const effective = await lireLaConfigEffective();
  // Avant tout le reste : registre, coût et réservation voient le modèle réellement appelé.
  const config = params.model ? { ...effective, model: params.model } : effective;

  if (!config.enabled) {
    throw new AppelsCoupesError();
  }

  if (config.mock) {
    await new Promise((resolve) => setTimeout(resolve, LATENCE_DU_MOCK_MS));
    return chargerLaFixture(params.contract, texteMisBoutABout(params.messages), params.system);
  }

  // Une instruction par place : deux appels simultanés n'obtiennent pas la même.
  await reserverLesDeuxPlaces(config, provenanceDeLAppel(params));

  return emettreAvecRepli(params, config);
}
