import { prisma } from "@/lib/db/client";
import { MAX_ATTEMPTS, STALL_AFTER_MS } from "@/lib/db/generation-job";
import type { AiBatch, GenerationJob } from "@/lib/db/types";

/**
 * Les jobs de questions et les lots qui les portent.
 *
 * Un job de questions naît en attente. Celui d'un dépôt est lancé aussitôt, en
 * appel direct ; celui d'une régénération attend la soumission groupée, qui
 * coûte moitié prix contre une latence de quelques heures. C'est le seul chemin
 * où le travail et sa réponse sont séparés par des heures.
 */

/** Concepts par requête. Au-delà, la sortie frôlerait `max_tokens`. */
export const CONCEPTS_PAR_JOB = 3;

export type JobDeQuestions = GenerationJob & { atomIds: string[] };

/**
 * Ce qui distingue une réécriture d'un premier jeu de questions.
 *
 * `partiraLe` diffère le départ : le job existe, il attend. `regeneration` dit
 * que ce job compte dans le plafond hebdomadaire du concept. Les deux ne sont
 * posés que par `lib/db/demande-de-questions.ts` — le découpage d'un dépôt,
 * lui, écrit des premiers jeux, qui ne diffèrent rien et ne comptent pas.
 */
export type FormeDuJob = { partiraLe?: Date; regeneration?: boolean };

/** Un job par groupe de trois concepts, dans l'ordre d'extraction. */
export async function creerJobsDeQuestions(
  inputId: string,
  atomIds: string[],
  forme: FormeDuJob = {},
): Promise<GenerationJob[]> {
  const groupes: string[][] = [];

  for (let debut = 0; debut < atomIds.length; debut += CONCEPTS_PAR_JOB) {
    groupes.push(atomIds.slice(debut, debut + CONCEPTS_PAR_JOB));
  }

  return prisma.$transaction(
    groupes.map((groupe) =>
      prisma.generationJob.create({
        data: {
          inputId,
          kind: "VARIANTS",
          atomIds: groupe,
          notBefore: forme.partiraLe ?? null,
          regeneration: forme.regeneration ?? false,
        },
      }),
    ),
  );
}

/**
 * Les jobs de questions qui attendent une soumission, les plus vieux d'abord.
 *
 * Deux populations depuis que le dépôt écrit ses questions en appel direct :
 * les régénérations, qui n'ont jamais été lancées et peuvent attendre ; et les
 * jobs qu'un appel direct a laissés en plan — jamais déclenchés, ou interrompus
 * en cours d'exécution. Le chemin groupé est leur rattrapage, et le seul
 * consommateur de ces jobs-là : sans ça, un processus recyclé au mauvais moment
 * laisserait un dépôt annoncer un travail en cours pour toujours.
 */
export async function trouverJobsASoumettre(
  limite: number,
  maintenant: Date = new Date(),
  /** Restreint aux jobs d'un compte. Absent depuis le cron, qui ramasse tout. */
  userId?: string,
): Promise<GenerationJob[]> {
  const bloqueAvant = new Date(maintenant.getTime() - STALL_AFTER_MS);

  return prisma.generationJob.findMany({
    where: {
      kind: "VARIANTS",
      batchId: null,
      attempts: { lt: MAX_ATTEMPTS },
      // Une demande reportée n'entre pas dans un lot avant sa date : elle
      // existe pour occuper la place, pas pour partir tout de suite.
      OR: [{ notBefore: null }, { notBefore: { lte: maintenant } }],
      AND: [{ OR: [{ status: "QUEUED" }, { status: "RUNNING", startedAt: { lt: bloqueAvant } }] }],
      ...(userId ? { input: { userId } } : {}),
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
