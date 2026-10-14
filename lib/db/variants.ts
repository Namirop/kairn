import { versionsDesPrompts } from "@/lib/ai/prompts";
import { prisma } from "@/lib/db/client";
import type { VariantFacet, VariantFormat } from "@/lib/db/types";
import { ordonnerLesOptions } from "@/lib/domain/ordre-des-options";

/**
 * Écriture des questions d'un concept. Ce qui est propre au format vit dans
 * `payload`. Aucun champ d'échéance ni de difficulté ici : la planification
 * porte sur l'Atom.
 */

export type QuestionAEcrire = {
  format: VariantFormat;
  facet: VariantFacet;
  question: string;
  answerKey: string;
  options: string[] | null;
  correctIndex: number | null;
  cloze: { sentence: string; accepted: string[]; leurres: string[] } | null;
  /** Ce que le modèle déclare d'une affirmation. Nul sur tout autre format. */
  estVraie?: boolean | null;
};

/**
 * Ce que le format ajoute à la question, ou rien.
 *
 * Les options d'un QCM sont remises en ordre avant écriture : le modèle met la
 * bonne réponse en tête neuf fois sur dix (voir `lib/domain/ordre-des-options.ts`).
 * La graine est concept + facette, faute d'id de Variant avant le `createMany` :
 * une facette est unique par lot et stable d'une régénération à l'autre.
 *
 * Un vrai ou faux y écrit son verdict `expected`. Sans lui, l'affirmation
 * retombe en question ouverte, alors qu'une sur deux est fausse par
 * construction. Le repli sur `answerKey` dans `choixDUnVraiOuFaux` ne sert
 * qu'aux lignes qui n'ont pas ce champ.
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
  /**
   * Le modèle qui a écrit ces questions, nommé par l'appelant : lui seul sait
   * si une surcharge d'environnement a remplacé le modèle par défaut.
   */
  model: string,
): Promise<number> {
  // Rien à écrire : on ne retire surtout pas ce qui existe, sans quoi une
  // régénération qui ne rend rien laisserait le concept sans aucune question.
  if (questions.length === 0) return 0;

  // La consigne sous laquelle elles ont été écrites dépend de la langue du
  // dépôt, et ce module est le seul à savoir de quel concept il s'agit.
  const { input } = await prisma.atom.findUniqueOrThrow({
    where: { id: atomId },
    select: { input: { select: { langue: true } } },
  });
  const promptVersion = versionsDesPrompts(input.langue).generate_variants;

  const [, ecrites] = await prisma.$transaction([
    // Les anciennes formulations sortent du tirage dans la même transaction que
    // l'arrivée des nouvelles : le concept reste révisable pendant l'attente.
    // Retirées et non supprimées : leurs Reviews les citent.
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

/**
 * Retire les questions d'un concept réécrit, sans les supprimer :
 * `Review.variantId` est en cascade, et supprimer emporterait l'historique de
 * révision du concept. Même règle que dans `ecrireQuestions`.
 */
export async function retirerQuestions(atomId: string, maintenant = new Date()): Promise<number> {
  const { count } = await prisma.variant.updateMany({
    where: { atomId, retiredAt: null },
    data: { retiredAt: maintenant },
  });

  return count;
}
