import { prisma } from "@/lib/db/client";
import type { VariantFacet, VariantFormat } from "@/lib/db/types";

/**
 * Écriture des questions d'un concept.
 *
 * Les données propres au format vivent dans `payload` : les options d'un QCM et
 * l'index de la bonne. Aucun champ d'échéance ni de difficulté n'apparaît ici —
 * la planification porte sur l'Atom, jamais sur la formulation.
 */

export type QuestionAEcrire = {
  format: VariantFormat;
  facet: VariantFacet;
  question: string;
  answerKey: string;
  options: string[] | null;
  correctIndex: number | null;
};

export async function ecrireQuestions(
  atomId: string,
  questions: QuestionAEcrire[],
): Promise<number> {
  const { count } = await prisma.variant.createMany({
    data: questions.map((question) => ({
      atomId,
      format: question.format,
      facet: question.facet,
      question: question.question,
      answerKey: question.answerKey,
      payload:
        question.options && question.correctIndex !== null
          ? { options: question.options, correctIndex: question.correctIndex }
          : undefined,
    })),
  });

  return count;
}

/** Les anciennes questions d'un concept réécrit : elles ne le décrivent plus. */
export async function effacerQuestions(atomId: string): Promise<number> {
  const { count } = await prisma.variant.deleteMany({ where: { atomId } });

  return count;
}
