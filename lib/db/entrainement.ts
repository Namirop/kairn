import { prisma } from "@/lib/db/client";
import { questionServie, type QuestionServie } from "@/lib/db/question-servie";
import { regenererSiUsees } from "@/lib/db/regeneration";
import type { ReviewRating } from "@/lib/db/types";
import { questionServable } from "@/lib/domain/question-servable";
import { apresLePassage } from "@/lib/domain/rotation-variantes";
import { composerEntrainement, QUESTIONS_PAR_TOUR } from "@/lib/domain/selection-entrainement";

/**
 * Concepts lus pour composer un tour.
 *
 * Dix fois ce qu'un tour sert : de quoi alterner les sujets et piocher des
 * facettes fraîches, sans que la lecture grandisse avec le corpus.
 */
const CONCEPTS_PAR_TOUR = 120;

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

/**
 * Un tour de questions tirées des concepts de cette personne.
 *
 * Seuls les concepts que l'utilisateur a lui-même sortis du cycle en sont
 * exclus : les reproposer contredirait le geste. L'archivage que le produit
 * pose au-delà de trois mois d'intervalle, lui, n'est qu'une étiquette d'état —
 * l'exclure reviendrait à retirer de l'entraînement précisément ce qu'on sait
 * le mieux, alors que la thèse du produit est qu'on croit savoir et qu'on
 * oublie. Tout le reste entre, échu ou non : l'entraînement ne regarde aucune
 * échéance, c'est tout son intérêt.
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
    // Un tour tire douze questions : il n'a jamais eu besoin de tout le corpus,
    // et le lire entier — concepts et variantes — était une lecture sans borne
    // qu'un clic répétait à volonté.
    //
    // L'ordre est celui du concept touché il y a le plus longtemps, et c'est ce
    // qui fait tourner la fenêtre : chaque passage d'entraînement horodate son
    // concept, donc celui qui vient de servir passe en fin de file et laisse la
    // place aux suivants. Sur un corpus plus grand que la fenêtre, tout finit
    // par passer.
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
      // Retirées comprises, pour la même raison qu'en session : une question
      // posée puis retirée pendant qu'on y répondait reste une question à
      // laquelle on a répondu.
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
    // Le curseur de rotation des tours, et rien d'autre. Aucune échéance ne le
    // lit : l'entraînement ne touche toujours à rien de la mémoire.
    prisma.atom.update({ where: { id: atome.id }, data: { trainedAt: maintenant } }),
  ]);

  // Le seul effet de l'entraînement au-delà de son propre compteur : les
  // questions s'usent d'être lues, quel que soit le mode. Ce n'est pas de la
  // planification — aucune échéance ne bouge —, c'est du renouvellement de
  // stock, et il est plafonné à une écriture par concept et par semaine.
  await regenererSiUsees(atome, apresLePassage(actives, variante.id, "TRAINING"), maintenant);

  return true;
}
