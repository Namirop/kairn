import { versionsDesPrompts } from "@/lib/ai/prompts";
import { prisma } from "@/lib/db/client";
import type { VariantFacet, VariantFormat } from "@/lib/db/types";
import { ordonnerLesOptions } from "@/lib/domain/ordre-des-options";

/** Ni échéance ni difficulté ici : la planification porte sur l'Atom. */

export type QuestionAEcrire = {
  format: VariantFormat;
  facet: VariantFacet;
  question: string;
  answerKey: string;
  options: string[] | null;
  correctIndex: number | null;
  cloze: { sentence: string; accepted: string[]; leurres: string[] } | null;
  /** Le verdict déclaré d'une affirmation ; nul sur tout autre format. */
  estVraie?: boolean | null;
};

/**
 * Options de QCM réordonnées : le modèle met la bonne réponse en tête neuf fois
 * sur dix. Graine concept + facette, faute d'id avant le `createMany` : unique
 * par lot et stable entre régénérations. Sans `expected`, un vrai ou faux
 * retomberait en question ouverte ; le repli sur `answerKey` sert aux anciennes
 * lignes.
 */
function payloadDe(question: QuestionAEcrire, atomId: string) {
  if (question.cloze) return question.cloze;

  if (question.options && question.correctIndex !== null) {
    return ordonnerLesOptions(
      question.options,
      question.correctIndex,
      `${atomId}:${question.facet}`,
    );
  }

  if (question.format === "TRUE_FALSE" && typeof question.estVraie === "boolean") {
    return { expected: question.estVraie };
  }

  return undefined;
}

export async function ecrireQuestions(
  atomId: string,
  questions: QuestionAEcrire[],
  /** Nommé par l'appelant : lui seul sait si l'environnement a changé le modèle. */
  model: string,
): Promise<number> {
  // Surtout ne rien retirer : le concept resterait sans aucune question.
  if (questions.length === 0) return 0;

  // La version de consigne dépend de la langue du dépôt.
  const { input } = await prisma.atom.findUniqueOrThrow({
    where: { id: atomId },
    select: { input: { select: { langue: true } } },
  });
  const promptVersion = versionsDesPrompts(input.langue).generate_variants;

  const [, ecrites] = await prisma.$transaction([
    // Même transaction que l'arrivée des nouvelles : le concept reste révisable.
    // Retirées, pas supprimées : leurs Reviews les citent.
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
        payload: payloadDe(question, atomId),
        promptVersion,
        model,
      })),
    }),
  ]);

  return ecrites.count;
}

/** Sans supprimer : `Review.variantId` est en cascade et emporterait l'historique. */
export async function retirerQuestions(atomId: string, maintenant = new Date()): Promise<number> {
  const { count } = await prisma.variant.updateMany({
    where: { atomId, retiredAt: null },
    data: { retiredAt: maintenant },
  });

  return count;
}
