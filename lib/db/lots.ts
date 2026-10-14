import { prisma } from "@/lib/db/client";
import { MAX_ATTEMPTS } from "@/lib/db/generation-job";
import type { GenerationJob } from "@/lib/db/types";

/**
 * Les jobs de questions : les écrire, et les couper quand ils débordent. Un job
 * naît en attente et part en appel direct, qu'il vienne d'un dépôt ou d'une
 * régénération.
 */

/**
 * Concepts par requête.
 *
 * Trois amortit le mieux la consigne, longue, sur un même appel ; descendre
 * doublerait les appels d'un dépôt. Trois peut toucher `max_tokens` : un groupe
 * qui déborde se coupe en deux au lieu d'échouer — voir
 * `scinderLeJobDeQuestions`.
 */
export const CONCEPTS_PAR_JOB = 3;

/**
 * `partiraLe` diffère le départ ; `regeneration` fait compter le job dans le
 * plafond hebdomadaire du concept. Seul `lib/db/demande-de-questions.ts` les
 * pose : le découpage d'un dépôt écrit des premiers jeux.
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
 * Coupe en deux un job de questions dont la sortie a été tronquée : il repart en
 * file avec `garde`, et `reporte` devient un job neuf — sinon la reprise
 * redemanderait exactement ce qui n'a pas tenu.
 *
 * Une seule transaction : rétrécir puis créer perdrait les concepts reportés si
 * la seconde écriture échouait, créer puis rétrécir les écrirait deux fois.
 *
 * Le job neuf hérite de la date de départ et du drapeau de régénération.
 *
 * Rend `false` quand les tentatives sont épuisées : l'échec reste un échec.
 */
export async function scinderLeJobDeQuestions(
  job: GenerationJob,
  garde: string[],
  reporte: string[],
  motif: string,
): Promise<boolean> {
  const suite = await prisma.generationJob.findUnique({
    where: { id: job.id },
    select: { attempts: true },
  });

  if (!suite || suite.attempts >= MAX_ATTEMPTS) return false;

  await prisma.$transaction([
    prisma.generationJob.update({
      where: { id: job.id },
      data: { atomIds: garde, status: "QUEUED", startedAt: null, lastError: motif },
    }),
    prisma.generationJob.create({
      data: {
        inputId: job.inputId,
        kind: "VARIANTS",
        atomIds: reporte,
        notBefore: job.notBefore,
        regeneration: job.regeneration ?? false,
      },
    }),
  ]);

  return true;
}
