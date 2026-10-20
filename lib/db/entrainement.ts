import { prisma } from "@/lib/db/client";
import { questionServie, type QuestionServie } from "@/lib/db/question-servie";
import { regenererSiUsees } from "@/lib/db/regeneration";
import type { ReviewRating } from "@/lib/db/types";
import { questionServable } from "@/lib/domain/question-servable";
import { apresLePassage } from "@/lib/domain/rotation-variantes";
import { composerEntrainement, QUESTIONS_PAR_TOUR } from "@/lib/domain/selection-entrainement";

/** Dix fois un tour : de quoi alterner les sujets sans lire tout le corpus. */
const CONCEPTS_PAR_TOUR = 120;

/**
 * Rien ici ne touche à la mémoire. À part de `revision.ts` exprès : fusionnés
 * derrière un drapeau, une ligne oubliée laisserait l'entraînement déplacer une
 * échéance.
 */

/**
 * Échus ou non. L'archivage automatique (`ARCHIVED`) reste : l'exclure
 * retirerait ce qu'on croit le mieux savoir. Seul l'archivage déclaré sort.
 */
export async function lireTourDentrainement(
  userId: string,
  taille: number = QUESTIONS_PAR_TOUR,
): Promise<QuestionServie[]> {
  const concepts = await prisma.atom.findMany({
    where: {
      userId,
      uncertain: false,
      archivedByUser: false,
      variants: { some: { retiredAt: null } },
    },
    // `trainedAt` fait tourner la fenêtre sur un corpus plus grand qu'elle.
    orderBy: { trainedAt: { sort: "asc", nulls: "first" } },
    take: CONCEPTS_PAR_TOUR,
    select: {
      id: true,
      concept: true,
      tags: true,
      variants: {
        where: { retiredAt: null },
        select: {
          id: true,
          format: true,
          facet: true,
          question: true,
          answerKey: true,
          payload: true,
          sessionCount: true,
          trainingCount: true,
          lastSessionAt: true,
          lastTrainedAt: true,
        },
      },
    },
  });

  // Même filet qu'en session : sans texte ni réponse, une carte blanche.
  const posables = concepts.map((concept) => ({
    ...concept,
    variants: concept.variants.filter(questionServable),
  }));

  const derniersEntrainements = new Map(
    posables.flatMap((concept) =>
      concept.variants.map((variante) => [variante.id, variante.lastTrainedAt] as const),
    ),
  );

  const tirage = composerEntrainement(posables, derniersEntrainements, taille);
  const parId = new Map(
    posables.flatMap((concept) =>
      concept.variants.map((variante) => [variante.id, { concept, variante }] as const),
    ),
  );

  return tirage.flatMap((question) => {
    const trouve = parId.get(question.variantId);

    if (!trouve) return [];

    const { concept, variante } = trouve;

    return [questionServie(concept, variante)];
  });
}

export type PassageDentrainement = {
  userId: string;
  atomId: string;
  variantId: string;
  note: ReviewRating;
  tempsMs: number;
};

/**
 * `false` si le concept n'est pas le sien ou la question pas la sienne : les
 * identifiants viennent du client. Stabilité recopiée avant et après : un zéro
 * ferait croire à un effondrement dans l'historique.
 */
export async function enregistrerEntrainement(
  passage: PassageDentrainement,
  maintenant: Date = new Date(),
): Promise<boolean> {
  const atome = await prisma.atom.findFirst({
    where: { id: passage.atomId, userId: passage.userId },
    select: {
      id: true,
      inputId: true,
      stability: true,
      // Retirées comprises : retirée en cours de réponse, elle a été répondue.
      variants: {
        select: {
          id: true,
          facet: true,
          retiredAt: true,
          sessionCount: true,
          trainingCount: true,
          lastSessionAt: true,
        },
      },
    },
  });

  const variante = atome?.variants.find((candidate) => candidate.id === passage.variantId);

  if (!atome || !variante) return false;

  const actives = atome.variants.filter((candidate) => candidate.retiredAt === null);

  await prisma.$transaction([
    prisma.review.create({
      data: {
        atomId: atome.id,
        variantId: variante.id,
        userId: passage.userId,
        rating: passage.note,
        responseTimeMs: passage.tempsMs,
        mode: "TRAINING",
        selfMastered: false,
        stabilityBefore: atome.stability,
        stabilityAfter: atome.stability,
        reviewedAt: maintenant,
      },
    }),
    prisma.variant.update({
      where: { id: variante.id },
      data: { trainingCount: { increment: 1 }, lastTrainedAt: maintenant },
    }),
    // Curseur de rotation des tours ; aucune échéance ne le lit.
    prisma.atom.update({ where: { id: atome.id }, data: { trainedAt: maintenant } }),
  ]);

  // L'usure vaut en tout mode : c'est du stock, pas de la planification,
  // plafonné à une régénération par concept et par semaine.
  await regenererSiUsees(atome, apresLePassage(actives, variante.id, "TRAINING"), maintenant);

  return true;
}
