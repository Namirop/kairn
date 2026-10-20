import { prisma } from "@/lib/db/client";
import type { Fournisseur } from "@/lib/ai/fournisseurs";
import { debutDuJourUtc } from "@/lib/domain/fenetre-utc";

/** `callAI()` y écrit chaque appel, succès comme échec. */

export type AppelAEnregistrer = {
  purpose: string;
  model: string;
  /** Colonne `AiCall.provider`. */
  fournisseur: Fournisseur;
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens?: number;
  cacheReadTokens?: number;
  /** Chaîne décimale, voir `lib/ai/cout-des-appels.ts`. */
  costUsd: string;
  latencyMs: number;
  success: boolean;
  errorCode?: string | null;
  userId?: string | null;
  jobId?: string | null;
  /** Le repli, chez le même fournisseur, a servi à la place du primaire. */
  basculee?: boolean;
};

export type ConsommationFenetre = {
  calls: number;
  inputTokens: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;
  outputTokens: number;
  costUsd: string;
};

/** Pour le banc d'évaluation : la dépense se lit au registre, elle ne s'estime pas. */
export async function sommerLesAppels(depuis: Date, jusqua?: Date): Promise<ConsommationFenetre> {
  const { _count, _sum } = await prisma.aiCall.aggregate({
    where: { createdAt: { gte: depuis, ...(jusqua ? { lte: jusqua } : {}) } },
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

export async function enregistrerLAppel(appel: AppelAEnregistrer): Promise<void> {
  await prisma.aiCall.create({
    data: {
      purpose: appel.purpose,
      provider: appel.fournisseur,
      model: appel.model,
      inputTokens: appel.inputTokens,
      cacheCreationTokens: appel.cacheCreationTokens ?? 0,
      cacheReadTokens: appel.cacheReadTokens ?? 0,
      outputTokens: appel.outputTokens,
      costUsd: appel.costUsd,
      latencyMs: appel.latencyMs,
      success: appel.success,
      errorCode: appel.errorCode ?? null,
      userId: appel.userId ?? null,
      jobId: appel.jobId ?? null,
      basculee: appel.basculee ?? false,
    },
  });
}

/**
 * Depuis minuit UTC, pour `SEUIL_BASCULES`. L'index partiel
 * `AiCall_basculee_createdAt_idx` borne la lecture quand le registre grossit.
 */
export async function compterBasculesDuJour(maintenant: Date = new Date()): Promise<number> {
  return prisma.aiCall.count({
    where: { basculee: true, createdAt: { gte: debutDuJourUtc(maintenant) } },
  });
}
