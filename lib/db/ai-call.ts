import { prisma } from "@/lib/db/client";
import type { Fournisseur } from "@/lib/ai/fournisseurs";

/**
 * Le registre des appels modèle. C'est ce que `callAI()` lit avant d'émettre et
 * écrit après, succès comme échec.
 */

export type AiCallRecord = {
  purpose: string;
  model: string;
  /**
   * La lignée qui a servi l'appel. Persistée en `AiCall.provider` — nommée
   * `fournisseur` côté TS pour rester alignée avec le reste du code AI, mais
   * la colonne base est en anglais comme le reste du schéma.
   */
  fournisseur: Fournisseur;
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens?: number;
  cacheReadTokens?: number;
  /** Chaîne décimale, voir lib/ai/pricing.ts. */
  costUsd: string;
  latencyMs: number;
  success: boolean;
  errorCode?: string | null;
  userId?: string | null;
  jobId?: string | null;
};

/** Ce qu'une fenêtre de temps a consommé. */
export type ConsommationFenetre = {
  calls: number;
  inputTokens: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;
  outputTokens: number;
  costUsd: string;
};

export function startOfUtcDay(instant: Date): Date {
  return new Date(Date.UTC(instant.getUTCFullYear(), instant.getUTCMonth(), instant.getUTCDate()));
}

/**
 * Nombre d'appels réels émis depuis minuit UTC.
 *
 * Sert à l'observation, pas à l'autorisation : c'est `reserverAppelModele()`
 * de `lib/db/ai-quota.ts` qui décide, parce qu'un compteur lu ici puis comparé
 * dans le code laisse passer deux appels simultanés.
 */
export async function countAiCallsToday(now: Date = new Date()): Promise<number> {
  return prisma.aiCall.count({ where: { createdAt: { gte: startOfUtcDay(now) } } });
}

/**
 * Appels, tokens et dollars d'une fenêtre. Le banc d'évaluation s'en sert pour
 * chiffrer un dépôt : la dépense se lit au registre, elle ne s'estime pas.
 */
export async function sumAiCalls(from: Date, to?: Date): Promise<ConsommationFenetre> {
  const { _count, _sum } = await prisma.aiCall.aggregate({
    where: { createdAt: { gte: from, ...(to ? { lte: to } : {}) } },
    _count: { _all: true },
    _sum: {
      inputTokens: true,
      cacheCreationTokens: true,
      cacheReadTokens: true,
      outputTokens: true,
      costUsd: true,
    },
  });

  return {
    calls: _count._all,
    inputTokens: _sum.inputTokens ?? 0,
    cacheCreationTokens: _sum.cacheCreationTokens ?? 0,
    cacheReadTokens: _sum.cacheReadTokens ?? 0,
    outputTokens: _sum.outputTokens ?? 0,
    costUsd: (_sum.costUsd ?? 0).toString(),
  };
}

export async function recordAiCall(record: AiCallRecord): Promise<void> {
  await prisma.aiCall.create({
    data: {
      purpose: record.purpose,
      provider: record.fournisseur,
      model: record.model,
      inputTokens: record.inputTokens,
      cacheCreationTokens: record.cacheCreationTokens ?? 0,
      cacheReadTokens: record.cacheReadTokens ?? 0,
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
