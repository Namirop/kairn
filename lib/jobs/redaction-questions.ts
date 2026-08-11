import { callAI } from "@/lib/ai/client";
import { SYSTEM_PROMPTS } from "@/lib/ai/prompts";
import { GENERATE_VARIANTS } from "@/lib/ai/schemas";
import { prisma } from "@/lib/db/client";
import { finishJob } from "@/lib/db/generation-job";
import type { GenerationJob } from "@/lib/db/types";
import { ecrireQuestions } from "@/lib/db/variants";

/**
 * L'écriture des questions d'un job, quel que soit le chemin qui l'a apporté.
 *
 * Deux chemins existent et partagent tout sauf l'émission. L'appel direct sert
 * le dépôt : on dépose, on veut jouer, et faire attendre les questions jusqu'au
 * lendemain cassait le geste. L'entraînement libre a invalidé le raisonnement
 * de la phase 2, qui ne tenait que tant que les questions ne servaient qu'à la
 * première révision. L'envoi groupé reste : il coûte moitié prix et sert la
 * régénération, qui peut attendre.
 */

/** Les concepts d'un job, dans l'ordre du job : c'est le rang annoncé au modèle. */
export async function conceptsDuJob(atomIds: string[]) {
  const atomes = await prisma.atom.findMany({
    where: { id: { in: atomIds } },
    select: { id: true, concept: true },
  });

  return atomIds.flatMap((id) => atomes.filter((atome) => atome.id === id));
}

/** Les concepts d'un envoi, numérotés : c'est ce rang que la sortie référence. */
export function messageDuGroupe(concepts: { concept: string }[]): string {
  return concepts.map((atome, rang) => `Concept ${rang + 1}.\n${atome.concept}`).join("\n\n");
}

type LotRendu = { rang: number; variants: Parameters<typeof ecrireQuestions>[1] };

/**
 * Range les lots rendus sous les concepts qui les attendaient.
 *
 * Rend les rangs restés sans réponse. Un lot manquant n'emporte pas les
 * autres : ce qui a été écrit est écrit.
 */
async function rangerLesLots(atomIds: string[], lots: LotRendu[]): Promise<number[]> {
  const manquants: number[] = [];

  for (const [rang, atomId] of atomIds.entries()) {
    const lot = lots.find((candidat) => candidat.rang === rang + 1);

    if (!lot) {
      manquants.push(rang + 1);
      continue;
    }

    await ecrireQuestions(atomId, lot.variants);
  }

  return manquants;
}

/** La relève d'un lot groupé : elle clôt elle-même le job qu'elle a relevé. */
export async function ecrireLesQuestionsDuJob(
  jobId: string,
  atomIds: string[],
  lots: LotRendu[],
): Promise<void> {
  const manquants = await rangerLesLots(atomIds, lots);

  await finishJob(
    jobId,
    manquants.length === atomIds.length ? "FAILED" : "DONE",
    manquants.length > 0
      ? `Aucune question rendue pour le concept ${manquants.join(", ")}.`
      : undefined,
  );
}

/**
 * Le chemin direct : un appel, les questions écrites, et c'est fini.
 *
 * C'est l'exécuteur qui clôt le job — on lui rend donc la main sans le
 * terminer, et on lève quand rien n'a été rendu pour que l'échec soit
 * enregistré avec son motif plutôt qu'avalé.
 */
export async function redigerLesQuestions(job: GenerationJob): Promise<void> {
  const depot = await prisma.input.findUnique({
    where: { id: job.inputId },
    select: { userId: true },
  });
  const concepts = await conceptsDuJob(job.atomIds);

  if (concepts.length === 0) {
    throw new Error(`Les concepts du job ${job.id} ont disparu.`);
  }

  const { lots } = await callAI({
    contract: GENERATE_VARIANTS,
    system: SYSTEM_PROMPTS.generate_variants,
    jobId: job.id,
    userId: depot?.userId,
    messages: [{ role: "user", content: messageDuGroupe(concepts) }],
  });

  const manquants = await rangerLesLots(job.atomIds, lots);

  if (manquants.length === job.atomIds.length) {
    throw new Error(`Aucune question rendue pour ce job (${manquants.length} concepts).`);
  }
}
