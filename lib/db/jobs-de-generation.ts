import { prisma } from "@/lib/db/client";
import { marquerPretSiPlusRienEnAttente } from "@/lib/db/fin-de-depot";
import type { GenerationJob, GenerationKind, JobStatus } from "@/lib/db/types";

/** Le passage en RUNNING est une prise atomique : de deux exécuteurs, un seul part. */

/** Au-delà, un job repris en boucle est déclaré en échec. */
export const TENTATIVES_MAX = 3;

/** Un job resté RUNNING plus longtemps a vu son processus mourir. */
export const BLOCAGE_APRES_MS = 10 * 60 * 1000;

export async function creerJobDeGeneration(
  inputId: string,
  kind: GenerationKind,
): Promise<GenerationJob> {
  return prisma.generationJob.create({ data: { inputId, kind } });
}

/**
 * `null` si un autre l'a pris. La garde `notBefore` vit ici, seul passage obligé
 * vers l'exécution : plus haut, un déclenchement direct la contournerait.
 */
export async function prendreLeJob(
  jobId: string,
  maintenant: Date = new Date(),
): Promise<GenerationJob | null> {
  const seuilDeBlocage = new Date(maintenant.getTime() - BLOCAGE_APRES_MS);

  const pris = await prisma.generationJob.updateMany({
    where: {
      id: jobId,
      attempts: { lt: TENTATIVES_MAX },
      OR: [{ notBefore: null }, { notBefore: { lte: maintenant } }],
      AND: [
        { OR: [{ status: "QUEUED" }, { status: "RUNNING", startedAt: { lt: seuilDeBlocage } }] },
      ],
    },
    data: { status: "RUNNING", startedAt: maintenant, attempts: { increment: 1 } },
  });

  if (pris.count !== 1) return null;

  return prisma.generationJob.findUnique({ where: { id: jobId } });
}

/**
 * Réservé au plafond d'appels atteint : pas un échec, et compter la tentative
 * condamnerait le job après trois journées chargées.
 */
export async function reporterJob(jobId: string, motif: string): Promise<void> {
  await prisma.generationJob.update({
    where: { id: jobId },
    data: { status: "QUEUED", startedAt: null, attempts: { decrement: 1 }, lastError: motif },
  });
}

/**
 * Travail incomplet : rétréci aux concepts sans questions et rendu au cron.
 * `DONE`, personne ne les reprendrait. La tentative reste comptée, sinon un
 * modèle qui rend deux lots sur trois boucle sans fin ; `false` si épuisées.
 */
export async function reprendreCeQuiManque(
  jobId: string,
  atomIds: string[],
  motif: string,
): Promise<boolean> {
  if ((await tentativesEpuisees(jobId)) || atomIds.length === 0) return false;

  await remettreEnFile(jobId, atomIds, motif);

  return true;
}

/** Vrai quand le job n'existe plus ou n'a plus de tentative à donner. */
export async function tentativesEpuisees(jobId: string): Promise<boolean> {
  const job = await prisma.generationJob.findUnique({
    where: { id: jobId },
    select: { attempts: true },
  });

  return !job || job.attempts >= TENTATIVES_MAX;
}

/** Tentatives inchangées. Non attendue, pour pouvoir entrer dans une transaction. */
export function remettreEnFile(jobId: string, atomIds: string[], motif: string) {
  return prisma.generationJob.update({
    where: { id: jobId },
    data: { atomIds, status: "QUEUED", startedAt: null, lastError: motif },
  });
}

export async function terminerLeJob(
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
 * Les trois natures : un job de questions dont le déclenchement s'est perdu
 * (processus recyclé) n'a pas d'autre filet. Une régénération passe après tout
 * dépôt : personne ne l'attend, et à trois jobs par quart d'heure un lot échu
 * laisserait un dépôt des heures sans questions. Pas de famine : la file des
 * dépôts se vide.
 */
export async function trouverLesJobsAReprendre(
  limite: number,
  maintenant: Date = new Date(),
): Promise<GenerationJob[]> {
  const seuilDeBlocage = new Date(maintenant.getTime() - BLOCAGE_APRES_MS);

  return prisma.generationJob.findMany({
    where: {
      kind: { in: ["OCR", "ATOMS", "VARIANTS"] },
      attempts: { lt: TENTATIVES_MAX },
      OR: [{ notBefore: null }, { notBefore: { lte: maintenant } }],
      AND: [
        { OR: [{ status: "QUEUED" }, { status: "RUNNING", startedAt: { lt: seuilDeBlocage } }] },
      ],
    },
    orderBy: [{ regeneration: "asc" }, { createdAt: "asc" }],
    take: limite,
  });
}

/** Sans ça, un job bloqué sans tentative restante resterait RUNNING pour toujours. */
export async function fermerLesJobsEpuises(maintenant: Date = new Date()): Promise<number> {
  const seuilDeBlocage = new Date(maintenant.getTime() - BLOCAGE_APRES_MS);

  const bloques = await prisma.generationJob.findMany({
    where: {
      status: "RUNNING",
      startedAt: { lt: seuilDeBlocage },
      attempts: { gte: TENTATIVES_MAX },
    },
    select: { id: true, inputId: true },
  });

  if (bloques.length === 0) return 0;

  await prisma.generationJob.updateMany({
    where: { id: { in: bloques.map((job) => job.id) } },
    data: {
      status: "FAILED",
      finishedAt: maintenant,
      lastError: `Interrompu ${TENTATIVES_MAX} fois sans jamais aboutir.`,
    },
  });

  // Sinon ces dépôts annonceraient un travail en cours indéfiniment.
  for (const inputId of new Set(bloques.map((job) => job.inputId))) {
    await marquerPretSiPlusRienEnAttente(inputId, "Ce dépôt a été interrompu trop de fois.");
  }

  return bloques.length;
}
