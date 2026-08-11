import { prisma } from "@/lib/db/client";
import { regenererSiUsees } from "@/lib/db/regeneration";
import type { ReviewRating, VariantFacet, VariantFormat } from "@/lib/db/types";
import { apresLePassage } from "@/lib/domain/rotation-variantes";
import { composerEntrainement, QUESTIONS_PAR_TOUR } from "@/lib/domain/selection-entrainement";

/**
 * L'entraînement libre : lire un tour de questions, écrire un passage.
 *
 * **Rien de ce qui est écrit ici ne touche à la mémoire.** Pas d'échéance, pas
 * de stabilité, pas de difficulté, pas d'état de maîtrise, pas de carte
 * ts-fsrs. On incrémente un compteur qui ne pilote aucune planification, et on
 * garde le passage dans l'histoire.
 *
 * C'est volontairement un fichier à part de `revision.ts`. Les deux écritures
 * se ressemblent assez pour qu'on soit tenté d'ajouter un drapeau à la
 * première ; le jour où quelqu'un le fait, une ligne oubliée derrière une
 * condition suffit à laisser l'entraînement déplacer une échéance. Ici, il n'y
 * a rien à oublier : le code qui replanifie n'existe pas dans ce fichier.
 */

export type QuestionDentrainement = {
  atomId: string;
  concept: string;
  tags: string[];
  variantId: string;
  format: VariantFormat;
  facet: VariantFacet;
  question: string;
  answerKey: string;
  payload: unknown;
};

/**
 * Un tour de questions tirées des concepts de cette personne.
 *
 * Les concepts archivés en sont exclus : ils sont sortis du cycle, les
 * reproposer à l'entraînement contredirait le geste. Tout le reste entre, échu
 * ou non — l'entraînement ne regarde aucune échéance, c'est tout son intérêt.
 */
export async function lireTourDentrainement(
  userId: string,
  taille: number = QUESTIONS_PAR_TOUR,
): Promise<QuestionDentrainement[]> {
  const concepts = await prisma.atom.findMany({
    where: {
      userId,
      uncertain: false,
      state: { not: "ARCHIVED" },
      variants: { some: { retiredAt: null } },
    },
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

  const derniersEntrainements = new Map(
    concepts.flatMap((concept) =>
      concept.variants.map((variante) => [variante.id, variante.lastTrainedAt] as const),
    ),
  );

  const tirage = composerEntrainement(concepts, derniersEntrainements, taille);
  const parId = new Map(
    concepts.flatMap((concept) =>
      concept.variants.map((variante) => [variante.id, { concept, variante }] as const),
    ),
  );

  return tirage.flatMap((question) => {
    const trouve = parId.get(question.variantId);

    if (!trouve) return [];

    const { concept, variante } = trouve;

    return [
      {
        atomId: concept.id,
        concept: concept.concept,
        tags: concept.tags,
        variantId: variante.id,
        format: variante.format,
        facet: variante.facet,
        question: variante.question,
        answerKey: variante.answerKey,
        payload: variante.payload,
      },
    ];
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
 * Rend `false` quand le concept n'est pas celui de cette personne, ou quand la
 * question ne porte pas sur ce concept : l'identifiant vient du client, il
 * n'est jamais cru sur parole.
 *
 * `stabilityBefore` et `stabilityAfter` recopient la stabilité du moment, sans
 * la modifier. Le passage doit rester lisible dans l'historique à côté des
 * autres, et un zéro y ferait croire à un effondrement qui n'a pas eu lieu.
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
      variants: {
        where: { retiredAt: null },
        select: {
          id: true,
          facet: true,
          sessionCount: true,
          trainingCount: true,
          lastSessionAt: true,
        },
      },
    },
  });

  const variante = atome?.variants.find((candidate) => candidate.id === passage.variantId);

  if (!atome || !variante) return false;

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
  ]);

  // Le seul effet de l'entraînement au-delà de son propre compteur : les
  // questions s'usent d'être lues, quel que soit le mode. Ce n'est pas de la
  // planification — aucune échéance ne bouge —, c'est du renouvellement de
  // stock, et il est plafonné à une écriture par concept et par semaine.
  await regenererSiUsees(
    atome,
    apresLePassage(atome.variants, variante.id, "TRAINING"),
    maintenant,
  );

  return true;
}
