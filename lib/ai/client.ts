import Anthropic from "@anthropic-ai/sdk";
import { recordAiCall } from "@/lib/db/ai-call";
import { readAiConfig, type AiConfig } from "./config";
import { reserverLesDeuxPlaces } from "./reservation";
import {
  AICallFailedError,
  AIDisabledError,
  AIMissingOutputError,
  AITruncatedOutputError,
  AiError,
} from "./errors";
import { loadFixture } from "./fixtures";
import { lireSortieStructuree } from "./lecture";
import { flattenText, toSdkMessage, type AiMessage } from "./message";
import { toOutputSchema } from "./output-schema";
import { computeCostUsd } from "./pricing";
import type { AiContract } from "./schemas";

/**
 * Le seul point d'entrée vers le modèle, et le seul fichier qui importe le SDK
 * Anthropic. C'est lui qui protège le budget.
 */

const MOCK_LATENCY_MS = 300;

export type CallAIParams<T> = {
  contract: AiContract<T>;
  system: string;
  messages: AiMessage[];
  maxTokens?: number;
  userId?: string;
  jobId?: string;
};

let cachedClient: { key: string; sdk: Anthropic } | null = null;

/**
 * Le SDK, prêt à servir. Exporté pour `batch.ts`, qui a besoin du même client
 * sans importer le paquet : ce fichier reste le seul à le connaître.
 */
export function sdkFor(config: AiConfig): Anthropic {
  const key = config.apiKey ?? "";
  if (cachedClient?.key !== key) {
    // Clé absente : on laisse le SDK résoudre lui-même ses identifiants et
    // lever son propre message, plus parlant qu'une chaîne vide.
    cachedClient = { key, sdk: new Anthropic({ apiKey: config.apiKey }) };
  }
  return cachedClient.sdk;
}

/** La sortie structurée arrive dans un bloc de texte, plus dans un bloc d'outil. */
function readStructuredOutput<T>(contract: AiContract<T>, response: Anthropic.Message): T {
  const block = response.content.find(
    (candidate): candidate is Anthropic.TextBlock => candidate.type === "text",
  );

  if (!block) {
    throw new AIMissingOutputError(contract.purpose);
  }

  return lireSortieStructuree(contract, block.text);
}

async function emit<T>(params: CallAIParams<T>, config: AiConfig): Promise<T> {
  const { contract } = params;
  const maxTokens = params.maxTokens ?? config.maxTokens;
  const ledger = {
    purpose: contract.purpose,
    model: config.model,
    userId: params.userId ?? null,
    jobId: params.jobId ?? null,
  };
  // Dérivé avant d'ouvrir le registre : une forme intraduisible est une erreur
  // de développement, pas un appel raté.
  const format = toOutputSchema(contract.forme);
  const startedAt = Date.now();
  let response: Anthropic.Message;

  try {
    response = await sdkFor(config).messages.create({
      model: config.model,
      max_tokens: maxTokens,
      // Le prompt système est identique d'un appel à l'autre. Depuis que
      // l'outil a disparu du préfixe, il est seul devant le point de cache :
      // sous le minimum de mise en cache du modèle, rien ne sera mis en cache
      // — le registre le dira.
      system: [{ type: "text", text: params.system, cache_control: { type: "ephemeral" } }],
      // Coupé, et ce n'est plus le forçage d'outil qui l'impose : ces trois
      // intentions n'ont rien montré qui demande du raisonnement. Le rouvrir
      // est une décision à prendre sur une mesure, pas un réglage à laisser
      // glisser.
      thinking: { type: "disabled" },
      messages: params.messages.map(toSdkMessage),
      // La forme est compilée en grammaire et contraint la génération. Un
      // tableau rendu en chaîne n'est plus improbable, il est impossible.
      output_config: { format },
    });
  } catch (error) {
    await recordAiCall({
      ...ledger,
      inputTokens: 0,
      outputTokens: 0,
      costUsd: "0",
      latencyMs: Date.now() - startedAt,
      success: false,
      errorCode: "AI_CALL_FAILED",
    });
    throw new AICallFailedError(contract.purpose, error);
  }

  const latencyMs = Date.now() - startedAt;
  const consommation = {
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
    cacheCreationTokens: response.usage.cache_creation_input_tokens ?? 0,
    cacheReadTokens: response.usage.cache_read_input_tokens ?? 0,
  };
  const costUsd = computeCostUsd(config.model, consommation);

  try {
    // Une réponse coupée porte une sortie incomplète mais parfois valide :
    // huit concepts demandés, cinq rendus, aucune erreur. C'est un échec.
    if (response.stop_reason === "max_tokens") {
      throw new AITruncatedOutputError(contract.purpose, maxTokens);
    }

    const value = readStructuredOutput(contract, response);
    await recordAiCall({ ...ledger, ...consommation, costUsd, latencyMs, success: true });
    return value;
  } catch (error) {
    await recordAiCall({
      ...ledger,
      ...consommation,
      costUsd,
      latencyMs,
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
  const config = readAiConfig();

  if (!config.enabled) {
    throw new AIDisabledError();
  }

  if (config.mock) {
    await new Promise((resolve) => setTimeout(resolve, MOCK_LATENCY_MS));
    return loadFixture(params.contract, flattenText(params.messages));
  }

  // Les places sont réservées avant d'émettre, chacune en une seule instruction :
  // deux appels simultanés ne peuvent pas obtenir la même.
  await reserverLesDeuxPlaces(config, params.userId);

  return emit(params, config);
}
