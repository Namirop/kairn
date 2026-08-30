import { prisma } from "@/lib/db/client";
import { MAX_ATTEMPTS } from "@/lib/db/generation-job";
import type { GenerationJob } from "@/lib/db/types";

/**
 * Les jobs de questions : les écrire, et les couper quand ils débordent.
 *
 * Un job naît en attente et part en appel direct, qu'il vienne d'un dépôt ou
 * d'une régénération. C'est le seul chemin depuis le 30/08/2026 : l'envoi groupé
 * séparait le travail de sa réponse de quelques heures pour un demi-tarif, et ce
 * demi-tarif coûtait six à sept fois l'appel direct depuis que le modèle
 * primaire est Luna.
 */

/**
 * Concepts par requête.
 *
 * Trois ne frôlait pas `max_tokens`, trois le touchait : à six mille jetons, la
 * production a coupé net six sorties sur neuf échecs. Le plafond est monté, et
 * un groupe qui déborde quand même se coupe en deux au lieu d'échouer — voir
 * `scinderLeJobDeQuestions`. Le nombre reste à trois parce que c'est celui qui
 * amortit le mieux la consigne, longue, sur les concepts d'un même appel ; le
 * descendre doublerait les appels d'un dépôt pour un débordement devenu rare.
 */
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
 * Coupe un job de questions en deux : ce qu'il garde, et un job neuf pour le
 * reste.
 *
 * Réservé à une sortie tronquée. Le job repart en file avec la moitié haute de
 * son groupe, l'autre moitié devient un job à part — sans quoi la reprise
 * redemanderait exactement ce qui vient de ne pas tenir.
 *
 * Les deux écritures vont dans la même transaction, et c'est tout l'intérêt de
 * les avoir mises ici : rétrécir d'abord puis créer laisserait les concepts
 * reportés nulle part si la seconde écriture échouait, et créer d'abord puis
 * rétrécir les ferait écrire deux fois si c'était la première.
 *
 * Le job neuf hérite de la date de départ et du drapeau de régénération : une
 * réécriture différée qui se coupe en deux reste différée, et continue de
 * compter dans le plafond hebdomadaire de son concept.
 *
 * Rend `false` quand les tentatives sont épuisées — l'appelant laisse alors
 * l'échec être un échec.
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
      data: { atomIds: garde, status: "QUEUED", startedAt: null, batchId: null, lastError: motif },
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
