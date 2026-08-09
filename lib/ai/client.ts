import Anthropic from "@anthropic-ai/sdk";
import type { ZodType } from "zod";
import { countAiCallsToday, recordAiCall } from "@/lib/db/ai-call";
import { readAiConfig, type AiConfig } from "./config";
import {
  AICallFailedError,
  AIDisabledError,
  AIInvalidOutputError,
  AIMissingToolUseError,
  AIQuotaError,
  AiError,
} from "./errors";
import { loadFixture } from "./fixtures";
import { textLength, type AiMessage } from "./message";
import { computeCostUsd } from "./pricing";
import { TOOL_NAMES, type AiPurpose } from "./schemas";
import { toToolInputSchema } from "./tool-schema";

/**
 * Le seul point d'entrée vers le modèle, et le seul fichier du projet qui
 * importe le SDK Anthropic. Voir la section « Règles sur les appels au modèle »
 * du CLAUDE.md : ce fichier est ce qui protège le budget.
 */

const MOCK_LATENCY_MS = 300;

export type CallAIParams<T> = {
  purpose: AiPurpose;
  schema: ZodType<T>;
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

function toSdkMessage(message: AiMessage): Anthropic.MessageParam {
  if (typeof message.content === "string") {
    return { role: message.role, content: message.content };
  }

  return {
    role: message.role,
    content: message.content.map((part) =>
      part.type === "text"
        ? { type: "text", text: part.text }
        : {
            type: "image",
            source: { type: "base64", media_type: part.mediaType, data: part.base64 },
          },
    ),
  };
}

function readToolUse<T>(purpose: AiPurpose, schema: ZodType<T>, response: Anthropic.Message): T {
  const block = response.content.find(
    (candidate): candidate is Anthropic.ToolUseBlock => candidate.type === "tool_use",
  );

  if (!block) {
    throw new AIMissingToolUseError(purpose);
  }

  const parsed = schema.safeParse(block.input);

  if (!parsed.success) {
    throw new AIInvalidOutputError(
      purpose,
      parsed.error.issues.map((issue) => `${issue.path.join(".")} : ${issue.message}`),
    );
  }

  return parsed.data;
}

function errorCodeOf(error: unknown): string {
  return error instanceof AiError ? error.code : "AI_UNKNOWN";
}

async function emit<T>(params: CallAIParams<T>, config: AiConfig): Promise<T> {
  const maxTokens = params.maxTokens ?? config.maxTokens;
  const ledger = {
    purpose: params.purpose,
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
      system: params.system,
      // Coupé volontairement : le raisonnement consommerait le budget de sortie
      // que ces extractions structurées réservent au résultat. À rouvrir en
      // phase 1 si les prompts le demandent, en relevant max_tokens d'autant.
      thinking: { type: "disabled" },
      messages: params.messages.map(toSdkMessage),
      tools: [
        {
          name: TOOL_NAMES[params.purpose],
          description: "Enregistre le résultat sous la forme attendue.",
          input_schema: toToolInputSchema(params.schema),
        },
      ],
      tool_choice: { type: "tool", name: TOOL_NAMES[params.purpose] },
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
    throw new AICallFailedError(params.purpose, error);
  }

  const latencyMs = Date.now() - startedAt;
  const inputTokens = response.usage.input_tokens;
  const outputTokens = response.usage.output_tokens;
  const costUsd = computeCostUsd(config.model, inputTokens, outputTokens);

  try {
    const value = readToolUse(params.purpose, params.schema, response);
    await recordAiCall({
      ...ledger,
      inputTokens,
      outputTokens,
      costUsd,
      latencyMs,
      success: true,
    });
    return value;
  } catch (error) {
    await recordAiCall({
      ...ledger,
      inputTokens,
      outputTokens,
      costUsd,
      latencyMs,
      success: false,
      errorCode: errorCodeOf(error),
    });
    throw error;
  }
}

/**
 * Appelle le modèle et rend une valeur déjà validée.
 *
 * Dans l'ordre : interrupteur, mode mock, plafond journalier, émission avec
 * `max_tokens` explicite et sortie structurée par outil, validation stricte,
 * puis écriture au registre — succès comme échec. Aucun retry.
 */
export async function callAI<T>(params: CallAIParams<T>): Promise<T> {
  const config = readAiConfig();

  if (!config.enabled) {
    throw new AIDisabledError();
  }

  if (config.mock) {
    await new Promise((resolve) => setTimeout(resolve, MOCK_LATENCY_MS));
    return loadFixture(params.purpose, params.schema, textLength(params.messages));
  }

  const used = await countAiCallsToday();

  if (used >= config.dailyCallCap) {
    throw new AIQuotaError(used, config.dailyCallCap);
  }

  return emit(params, config);
}
