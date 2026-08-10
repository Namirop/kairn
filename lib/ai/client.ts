import Anthropic from "@anthropic-ai/sdk";
import { recordAiCall } from "@/lib/db/ai-call";
import { reserverAppelModele } from "@/lib/db/ai-quota";
import { readAiConfig, type AiConfig } from "./config";
import { apercuBrut, decrireIssues } from "./diagnostic";
import {
  AICallFailedError,
  AIDisabledError,
  AIInvalidOutputError,
  AIMissingToolUseError,
  AIQuotaError,
  AITruncatedOutputError,
  AiError,
} from "./errors";
import { loadFixture } from "./fixtures";
import { flattenText, toSdkMessage, type AiMessage } from "./message";
import { computeCostUsd } from "./pricing";
import { TOOL_NAMES, type AiContract } from "./schemas";
import { toToolInputSchema } from "./tool-schema";

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

function sdkFor(config: AiConfig): Anthropic {
  const key = config.apiKey ?? "";
  if (cachedClient?.key !== key) {
    // Clé absente : on laisse le SDK résoudre lui-même ses identifiants et
    // lever son propre message, plus parlant qu'une chaîne vide.
    cachedClient = { key, sdk: new Anthropic({ apiKey: config.apiKey }) };
  }
  return cachedClient.sdk;
}

function readToolUse<T>(contract: AiContract<T>, response: Anthropic.Message): T {
  const block = response.content.find(
    (candidate): candidate is Anthropic.ToolUseBlock => candidate.type === "tool_use",
  );

  if (!block) {
    throw new AIMissingToolUseError(contract.purpose);
  }

  const parsed = contract.validation.safeParse(block.input);

  if (!parsed.success) {
    throw new AIInvalidOutputError(
      contract.purpose,
      decrireIssues(parsed.error, block.input),
      apercuBrut(block.input),
    );
  }

  return parsed.data;
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
  const startedAt = Date.now();
  let response: Anthropic.Message;

  try {
    response = await sdkFor(config).messages.create({
      model: config.model,
      max_tokens: maxTokens,
      // Le prompt système et l'outil sont identiques d'un appel à l'autre : le
      // point de cache posé ici couvre les deux, l'outil étant rendu avant.
      system: [{ type: "text", text: params.system, cache_control: { type: "ephemeral" } }],
      // Coupé : la sortie structurée repose sur un `tool_choice` qui force un
      // outil, et le raisonnement étendu ne s'y ajoute pas. Le rouvrir voudrait
      // dire repasser en `tool_choice: auto` et gérer l'absence de bloc d'outil.
      thinking: { type: "disabled" },
      messages: params.messages.map(toSdkMessage),
      tools: [
        {
          name: TOOL_NAMES[contract.purpose],
          description: "Enregistre le résultat sous la forme attendue.",
          input_schema: toToolInputSchema(contract.forme),
        },
      ],
      tool_choice: { type: "tool", name: TOOL_NAMES[contract.purpose] },
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
    // Une réponse coupée porte un bloc d'outil incomplet mais parfois valide :
    // huit concepts demandés, cinq rendus, aucune erreur. C'est un échec.
    if (response.stop_reason === "max_tokens") {
      throw new AITruncatedOutputError(contract.purpose, maxTokens);
    }

    const value = readToolUse(contract, response);
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
 * interrupteur, mode mock, plafond journalier, émission avec `max_tokens`
 * explicite et sortie structurée par outil, refus d'une réponse tronquée,
 * validation stricte, puis écriture au registre — succès comme échec. Aucun
 * retry.
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

  // La place est réservée avant d'émettre, en une seule instruction : deux
  // appels simultanés ne peuvent pas obtenir la même.
  const reservation = await reserverAppelModele(config.dailyCallCap);

  if (!reservation.obtenue) {
    throw new AIQuotaError(reservation.utilisees, config.dailyCallCap);
  }

  return emit(params, config);
}
