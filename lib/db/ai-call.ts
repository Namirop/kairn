import { prisma } from "@/lib/db/client";

/**
 * Le registre des appels modèle. C'est ce que `callAI()` lit avant d'émettre et
 * écrit après, succès comme échec.
 */

export type AiCallRecord = {
  purpose: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  /** Chaîne décimale, voir lib/ai/pricing.ts. */
  costUsd: string;
  latencyMs: number;
  success: boolean;
  errorCode?: string | null;
  userId?: string | null;
  jobId?: string | null;
};

function startOfUtcDay(instant: Date): Date {
  return new Date(Date.UTC(instant.getUTCFullYear(), instant.getUTCMonth(), instant.getUTCDate()));
}

/**
 * Nombre d'appels réels émis depuis minuit UTC. Le plafond est global au
 * produit, pas par utilisateur : la journée se compte donc en UTC, pas dans le
 * fuseau de qui déclenche l'appel.
 */
export async function countAiCallsToday(now: Date = new Date()): Promise<number> {
  return prisma.aiCall.count({ where: { createdAt: { gte: startOfUtcDay(now) } } });
}

export async function recordAiCall(record: AiCallRecord): Promise<void> {
  await prisma.aiCall.create({
    data: {
      purpose: record.purpose,
      model: record.model,
      inputTokens: record.inputTokens,
      outputTokens: record.outputTokens,
      costUsd: record.costUsd,
      latencyMs: record.latencyMs,
      success: record.success,
      errorCode: record.errorCode ?? null,
      userId: record.userId ?? null,
      jobId: record.jobId ?? null,
    },
  });
}
