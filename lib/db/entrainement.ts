import { prisma } from "@/lib/db/client";
import { questionServie, type QuestionServie } from "@/lib/db/question-servie";
import { regenererSiUsees } from "@/lib/db/regeneration";
import type { ReviewRating } from "@/lib/db/types";
import { questionServable } from "@/lib/domain/question-servable";
import { apresLePassage } from "@/lib/domain/rotation-variantes";
import { composerEntrainement, QUESTIONS_PAR_TOUR } from "@/lib/domain/selection-entrainement";

/**
 * Concepts lus pour composer un tour : dix fois ce qu'un tour sert, de quoi
 * alterner les sujets sans que la lecture grandisse avec le corpus.
 */
const CONCEPTS_PAR_TOUR = 120;

/**
 * L'entraînement libre : lire un tour de questions, écrire un passage.
 *
 * Rien ici ne touche à la mémoire (échéance, stabilité, difficulté, état,
 * carte ts-fsrs). C'est volontairement un fichier à part de `revision.ts` : ne
 * pas fusionner les deux derrière un drapeau, une ligne oubliée suffirait à
 * laisser l'entraînement déplacer une échéance.
 */

/**
 * Un tour de questions tirées des concepts de cette personne, échus ou non.
 *
 * Seuls les concepts sortis du cycle par l'utilisateur sont exclus. L'archivage
 * automatique (`ARCHIVED`) reste : l'exclure retirerait de l'entraînement ce
 * qu'on croit le mieux savoir.
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
    // Le moins récemment entraîné d'abord : chaque passage horodate son concept
    // (`trainedAt`), ce qui fait tourner la fenêtre sur un corpus plus grand
    // qu'elle.
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

  // Même filet que dans la session : une formulation sans texte ni réponse
  // s'afficherait en carte blanche. Voir `question-servable.ts`.
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
 * Écrit un passage d'entraînement.
 *
 * Rend `false` quand le concept n'est pas à cette personne, ou que la question
 * ne porte pas sur lui : les identifiants viennent du client.
 *
 * `stabilityBefore` et `stabilityAfter` recopient la stabilité du moment : un
 * zéro ferait croire, dans l'historique, à un effondrement.
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
      // Retirées comprises : une question retirée pendant qu'on y répondait
      // reste une question à laquelle on a répondu.
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
    // Le curseur de rotation des tours, et rien d'autre : aucune échéance ne le lit.
    prisma.atom.update({ where: { id: atome.id }, data: { trainedAt: maintenant } }),
  ]);

  // Les questions s'usent d'être lues, quel que soit le mode : c'est du
  // renouvellement de stock, pas de la planification, et il est plafonné à une
  // régénération par concept et par semaine.
  await regenererSiUsees(atome, apresLePassage(actives, variante.id, "TRAINING"), maintenant);

  return true;
}
