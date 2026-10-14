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
 * depuis `STALL_AFTER_MS`. Rend `null` si quelqu'un d'autre l'a déjà pris.
 *
 * La garde sur `notBefore` est ici parce que c'est le seul passage obligé vers
 * l'exécution : plus haut, un déclenchement direct la contournerait.
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
 * Rend le job à la file sans lui compter sa tentative. Réservé au plafond
 * d'appels atteint : ce n'est pas un échec, et compter la tentative le
 * condamnerait au bout de trois journées chargées.
 */
export async function reporterJob(jobId: string, motif: string): Promise<void> {
  await prisma.generationJob.update({
    where: { id: jobId },
    data: { status: "QUEUED", startedAt: null, attempts: { decrement: 1 }, lastError: motif },
  });
}

/**
 * Le travail rendu par un job est incomplet : il est rétréci aux concepts sans
 * questions et rendu à la file, où le cron le reprend. Terminé `DONE`, ces
 * concepts ne seraient repris par personne, et l'écran ne dirait rien tant
 * qu'un seul concept est servable.
 *
 * La tentative reste comptée, sans quoi un modèle qui rend toujours deux lots
 * sur trois boucle sans fin. Rend `false` quand elles sont épuisées : l'appelant
 * laisse alors le job échouer.
 */
export async function reprendreCeQuiManque(
  jobId: string,
  atomIds: string[],
  motif: string,
): Promise<boolean> {
  const job = await prisma.generationJob.findUnique({
    where: { id: jobId },
    select: { attempts: true },
  });

  if (!job || job.attempts >= MAX_ATTEMPTS || atomIds.length === 0) return false;

  await prisma.generationJob.update({
    where: { id: jobId },
    data: { atomIds, status: "QUEUED", startedAt: null, lastError: motif },
  });

  return true;
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
 * Jobs que le cron peut relancer : en file, ou bloqués en cours. Les trois
 * natures y sont : un job de questions dont le déclenchement après réponse s'est
 * perdu (processus recyclé) n'a pas d'autre filet.
 *
 * Une régénération passe toujours après un dépôt, quel que soit son âge :
 * personne ne l'attend, alors qu'un dépôt est quelqu'un devant un écran. À trois
 * jobs par passage toutes les quinze minutes, un lot de régénérations échues
 * devant un dépôt le laisse des heures sans questions. L'ancienneté départage
 * ensuite ; les régénérations ne meurent pas de faim, la file des dépôts se vide.
 */
export async function findResumableJobs(
  limit: number,
  now: Date = new Date(),
): Promise<GenerationJob[]> {
  const stallCutoff = new Date(now.getTime() - STALL_AFTER_MS);

  return prisma.generationJob.findMany({
    where: {
      kind: { in: ["OCR", "ATOMS", "VARIANTS"] },
      attempts: { lt: MAX_ATTEMPTS },
      OR: [{ notBefore: null }, { notBefore: { lte: now } }],
      AND: [{ OR: [{ status: "QUEUED" }, { status: "RUNNING", startedAt: { lt: stallCutoff } }] }],
    },
    orderBy: [{ regeneration: "asc" }, { createdAt: "asc" }],
    take: limit,
  });
}

/**
 * Ferme les jobs bloqués qui ont épuisé leurs tentatives. Sans ça ils
 * resteraient RUNNING pour toujours, jamais repris.
 */
export async function failExhaustedJobs(now: Date = new Date()): Promise<number> {
  const stallCutoff = new Date(now.getTime() - STALL_AFTER_MS);

  const bloques = await prisma.generationJob.findMany({
    where: {
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
