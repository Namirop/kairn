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
  // Rien à écrire : on ne retire surtout pas ce qui existe, sans quoi une
  // régénération qui ne rend rien laisserait le concept sans aucune question.
  if (questions.length === 0) return 0;

  const [, ecrites] = await prisma.$transaction([
    // Les anciennes formulations sortent du tirage à l'instant où les nouvelles
    // arrivent, jamais avant : entre la mise en file et la relève il peut se
    // passer des heures, et le concept doit rester révisable pendant ce temps.
    // Elles sont retirées et non supprimées — leurs Reviews passées les citent.
    prisma.variant.updateMany({
      where: { atomId, retiredAt: null },
      data: { retiredAt: new Date() },
    }),
    prisma.variant.createMany({
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
    }),
  ]);

  return ecrites.count;
}

/** Les anciennes questions d'un concept réécrit : elles ne le décrivent plus. */
export async function effacerQuestions(atomId: string): Promise<number> {
  const { count } = await prisma.variant.deleteMany({ where: { atomId } });

  return count;
}
