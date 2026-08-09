import { prisma } from "@/lib/db/client";
import type { GenerationJob, GenerationKind, JobStatus } from "@/lib/db/types";

/**
 * Accès aux jobs de génération. Le passage en RUNNING est une prise de jeton
 * atomique : deux exécuteurs qui visent le même job, seul l'un des deux part.
 */

/** Au-delà, un job repris en boucle est déclaré en échec. */
export const MAX_ATTEMPTS = 3;

/** Un job resté RUNNING plus longtemps a vu son processus mourir. */
export const STALL_AFTER_MS = 10 * 60 * 1000;

export async function createGenerationJob(
  inputId: string,
  kind: GenerationKind,
): Promise<GenerationJob> {
  return prisma.generationJob.create({ data: { inputId, kind } });
}

/**
 * Prend le job s'il est encore à prendre : en attente, ou bloqué en cours
 * depuis plus de dix minutes. Rend `null` si quelqu'un d'autre l'a déjà pris.
 */
export async function claimJob(
  jobId: string,
  now: Date = new Date(),
): Promise<GenerationJob | null> {
  const stallCutoff = new Date(now.getTime() - STALL_AFTER_MS);

  const claimed = await prisma.generationJob.updateMany({
    where: {
      id: jobId,
      attempts: { lt: MAX_ATTEMPTS },
      OR: [{ status: "QUEUED" }, { status: "RUNNING", startedAt: { lt: stallCutoff } }],
    },
    data: { status: "RUNNING", startedAt: now, attempts: { increment: 1 } },
  });

  if (claimed.count !== 1) return null;

  return prisma.generationJob.findUnique({ where: { id: jobId } });
}

export async function finishJob(
  jobId: string,
  status: Extract<JobStatus, "DONE" | "FAILED">,
  lastError?: string,
): Promise<void> {
  await prisma.generationJob.update({
    where: { id: jobId },
    data: { status, finishedAt: new Date(), lastError: lastError ?? null },
  });
}

/** Jobs que le cron peut relancer, les plus anciens d'abord. */
export async function findResumableJobs(
  limit: number,
  now: Date = new Date(),
): Promise<GenerationJob[]> {
  const stallCutoff = new Date(now.getTime() - STALL_AFTER_MS);

  return prisma.generationJob.findMany({
    where: {
      attempts: { lt: MAX_ATTEMPTS },
      OR: [{ status: "QUEUED" }, { status: "RUNNING", startedAt: { lt: stallCutoff } }],
    },
    orderBy: { createdAt: "asc" },
    take: limit,
  });
}

/**
 * Ferme les jobs bloqués qui ont épuisé leurs tentatives. Sans ça ils
 * resteraient RUNNING pour toujours, invisibles et jamais repris.
 */
export async function failExhaustedJobs(now: Date = new Date()): Promise<number> {
  const stallCutoff = new Date(now.getTime() - STALL_AFTER_MS);

  const { count } = await prisma.generationJob.updateMany({
    where: {
      status: "RUNNING",
      startedAt: { lt: stallCutoff },
      attempts: { gte: MAX_ATTEMPTS },
    },
    data: {
      status: "FAILED",
      finishedAt: now,
      lastError: `Interrompu ${MAX_ATTEMPTS} fois sans jamais aboutir.`,
    },
  });

  return count;
}
