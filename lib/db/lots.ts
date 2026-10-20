import { prisma } from "@/lib/db/client";
import { remettreEnFile, tentativesEpuisees } from "@/lib/db/jobs-de-generation";
import type { GenerationJob } from "@/lib/db/types";

/** Un job de questions naît en attente et part en appel direct, dépôt ou régénération. */

/**
 * Trois amortit le mieux la consigne, longue ; descendre doublerait les appels
 * d'un dépôt. Un groupe qui touche `max_tokens` se coupe en deux, voir
 * `scinderLeJobDeQuestions`.
 */
export const CONCEPTS_PAR_JOB = 3;

/**
 * `regeneration` compte dans le plafond hebdomadaire. Seul
 * `demande-de-questions.ts` les pose : un dépôt écrit des premiers jeux.
 */
export type FormeDuJob = { partiraLe?: Date; regeneration?: boolean };

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
 * Sortie tronquée : la reprise entière redemanderait ce qui n'a pas tenu. Une
 * transaction : rétrécir puis créer perdrait `reporte` sur un échec, créer puis
 * rétrécir l'écrirait deux fois. `false` si les tentatives sont épuisées.
 */
export async function scinderLeJobDeQuestions(
  job: GenerationJob,
  garde: string[],
  reporte: string[],
  motif: string,
): Promise<boolean> {
  if (await tentativesEpuisees(job.id)) return false;

  await prisma.$transaction([
    remettreEnFile(job.id, garde, motif),
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
