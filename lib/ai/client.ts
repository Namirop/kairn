import { recordAiCall } from "@/lib/db/ai-call";
import { type AiConfig } from "./config";
import { choisirFournisseur, sdkFor } from "./fournisseurs";
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

/**
 * Le seul point d'entrée vers le modèle. C'est lui qui protège le budget.
 *
 * Les appels réseau vivent dans `fournisseurs/` — un pont par lignée, derrière
 * une interface commune. Ici, on résout le pont depuis la config, on garde les
 * garde-fous (interrupteur, mode mock, réservation), et on écrit au registre —
 * succès comme échec. Aucun retry.
 */

const MOCK_LATENCY_MS = 300;

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

async function emit<T>(params: CallAIParams<T>, config: AiConfig): Promise<T> {
  const { contract } = params;
  const maxTokens = params.maxTokens ?? config.maxTokens;
  const ledger = {
    purpose: contract.purpose,
    model: config.model,
    fournisseur: config.fournisseur,
    userId: params.userId ?? null,
    jobId: params.jobId ?? null,
  };
  // Dérivé avant d'ouvrir le registre : une forme intraduisible est une erreur
  // de développement, pas un appel raté.
  const format = toOutputSchema(contract.forme);
  const pont = choisirFournisseur(config.fournisseur, {
    anthropicApiKey: config.apiKey,
    openrouterApiKey: config.openrouterApiKey,
  });

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

/**
 * Appelle le modèle et rend une valeur déjà validée. Dans l'ordre :
 * interrupteur, mode mock, part du compte, plafond journalier, émission avec
 * `max_tokens` explicite et sortie contrainte par grammaire, refus d'une
 * réponse tronquée, validation stricte, puis écriture au registre — succès
 * comme échec. Aucun retry.
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
