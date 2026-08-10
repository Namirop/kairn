import { prisma } from "@/lib/db/client";
import { MAX_ATTEMPTS } from "@/lib/db/generation-job";
import type { AiBatch, GenerationJob } from "@/lib/db/types";

/**
 * Les jobs de questions et les lots qui les portent.
 *
 * Un job de questions ne passe pas par l'exécuteur : il est créé en attente,
 * soumis en groupe, puis terminé par la relève. C'est le seul chemin où le
 * travail et sa réponse sont séparés par des heures.
 */

/** Concepts par requête. Au-delà, la sortie frôlerait `max_tokens`. */
export const CONCEPTS_PAR_JOB = 3;

export type JobDeQuestions = GenerationJob & { atomIds: string[] };

/** Un job par groupe de trois concepts, dans l'ordre d'extraction. */
export async function creerJobsDeQuestions(
  inputId: string,
  atomIds: string[],
): Promise<GenerationJob[]> {
  const groupes: string[][] = [];

  for (let debut = 0; debut < atomIds.length; debut += CONCEPTS_PAR_JOB) {
    groupes.push(atomIds.slice(debut, debut + CONCEPTS_PAR_JOB));
  }

  return prisma.$transaction(
    groupes.map((groupe) =>
      prisma.generationJob.create({ data: { inputId, kind: "VARIANTS", atomIds: groupe } }),
    ),
  );
}

/** Les jobs de questions qui attendent une soumission, les plus vieux d'abord. */
export async function trouverJobsASoumettre(limite: number): Promise<GenerationJob[]> {
  return prisma.generationJob.findMany({
    where: {
      kind: "VARIANTS",
      status: "QUEUED",
      batchId: null,
      attempts: { lt: MAX_ATTEMPTS },
    },
    orderBy: { createdAt: "asc" },
    take: limite,
  });
}

/** Le lot est parti : ses jobs sont en cours et portent son identifiant. */
export async function enregistrerLot(providerId: string, jobIds: string[]): Promise<AiBatch> {
  const lot = await prisma.aiBatch.create({
    data: { providerId, requests: jobIds.length },
  });

  await prisma.generationJob.updateMany({
    where: { id: { in: jobIds } },
    data: { status: "RUNNING", startedAt: new Date(), batchId: lot.id, attempts: { increment: 1 } },
  });

  return lot;
}

export async function lireLotsOuverts(limite: number): Promise<AiBatch[]> {
  return prisma.aiBatch.findMany({
    where: { status: "SUBMITTED" },
    orderBy: { createdAt: "asc" },
    take: limite,
  });
}

export async function lireJobsDuLot(batchId: string): Promise<GenerationJob[]> {
  return prisma.generationJob.findMany({ where: { batchId } });
}

export async function cloreLot(batchId: string, statut: "ENDED" | "FAILED"): Promise<void> {
  await prisma.aiBatch.update({
    where: { id: batchId },
    data: { status: statut, endedAt: new Date(), polledAt: new Date() },
  });
}

export async function noterRelevee(batchId: string): Promise<void> {
  await prisma.aiBatch.update({ where: { id: batchId }, data: { polledAt: new Date() } });
}

/**
 * Rend les jobs à la file quand leur lot n'a rien donné. Ceux qui ont épuisé
 * leurs tentatives restent en échec : on ne relance pas en boucle.
 */
export async function rendreJobsALaFile(jobIds: string[], motif: string): Promise<void> {
  await prisma.generationJob.updateMany({
    where: { id: { in: jobIds }, attempts: { lt: MAX_ATTEMPTS } },
    data: { status: "QUEUED", batchId: null, lastError: motif },
  });

  await prisma.generationJob.updateMany({
    where: { id: { in: jobIds }, attempts: { gte: MAX_ATTEMPTS } },
    data: { status: "FAILED", finishedAt: new Date(), lastError: motif },
  });
}
