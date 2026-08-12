import { prisma } from "@/lib/db/client";
import { marquerPretSiPlusRienEnAttente } from "@/lib/db/fin-de-depot";
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
 *
 * Une demande reportée est refusée jusqu'à sa date. La garde est ici et nulle
 * part ailleurs : c'est le seul passage obligé vers l'exécution, et un
 * déclenchement direct la contournerait partout où on l'aurait mise plus haut.
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
      OR: [{ notBefore: null }, { notBefore: { lte: now } }],
      AND: [{ OR: [{ status: "QUEUED" }, { status: "RUNNING", startedAt: { lt: stallCutoff } }] }],
    },
    data: { status: "RUNNING", startedAt: now, attempts: { increment: 1 } },
  });

  if (claimed.count !== 1) return null;

  return prisma.generationJob.findUnique({ where: { id: jobId } });
}

/**
 * Rend le job à la file sans lui compter sa tentative.
 *
 * Réservé au plafond d'appels atteint. Ce n'est pas un échec : rien ne s'est
 * cassé, la journée est simplement pleine, et le même travail réussira demain
 * à l'identique. Lui compter une tentative le condamnerait au bout de trois
 * journées chargées, pour une raison qui ne le concerne pas.
 */
export async function reporterJob(jobId: string, motif: string): Promise<void> {
  await prisma.generationJob.update({
    where: { id: jobId },
    data: { status: "QUEUED", startedAt: null, attempts: { decrement: 1 }, lastError: motif },
  });
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

/**
 * Jobs que le cron peut relancer, les plus anciens d'abord.
 *
 * Les jobs de questions en sont exclus : ils vivent dans un lot chez le
 * fournisseur, et les reprendre ici les marquerait terminés sans réponse.
 */
export async function findResumableJobs(
  limit: number,
  now: Date = new Date(),
): Promise<GenerationJob[]> {
  const stallCutoff = new Date(now.getTime() - STALL_AFTER_MS);

  return prisma.generationJob.findMany({
    where: {
      kind: { in: ["OCR", "ATOMS"] },
      attempts: { lt: MAX_ATTEMPTS },
      OR: [{ notBefore: null }, { notBefore: { lte: now } }],
      AND: [{ OR: [{ status: "QUEUED" }, { status: "RUNNING", startedAt: { lt: stallCutoff } }] }],
    },
    orderBy: { createdAt: "asc" },
    take: limit,
  });
}

/**
 * Ferme les jobs bloqués qui ont épuisé leurs tentatives. Sans ça ils
 * resteraient RUNNING pour toujours, invisibles et jamais repris.
 *
 * Un job de questions parti en lot est exclu : il vit chez le fournisseur, et
 * c'est la relève qui le termine. Un job de questions sans lot, lui, entre —
 * depuis qu'ils partent en appel direct, ils peuvent se bloquer comme les
 * autres.
 */
export async function failExhaustedJobs(now: Date = new Date()): Promise<number> {
  const stallCutoff = new Date(now.getTime() - STALL_AFTER_MS);

  const bloques = await prisma.generationJob.findMany({
    where: {
      batchId: null,
      status: "RUNNING",
      startedAt: { lt: stallCutoff },
      attempts: { gte: MAX_ATTEMPTS },
    },
    select: { id: true, inputId: true },
  });

  if (bloques.length === 0) return 0;

  await prisma.generationJob.updateMany({
    where: { id: { in: bloques.map((job) => job.id) } },
    data: {
      status: "FAILED",
      finishedAt: now,
      lastError: `Interrompu ${MAX_ATTEMPTS} fois sans jamais aboutir.`,
    },
  });

  // Ces dépôts n'attendent plus rien : sans cette clôture, ils annonceraient un
  // travail en cours indéfiniment.
  for (const inputId of new Set(bloques.map((job) => job.inputId))) {
    await marquerPretSiPlusRienEnAttente(inputId, "Ce dépôt a été interrompu trop de fois.");
  }

  return bloques.length;
}
