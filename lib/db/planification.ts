import { fsrs, generatorParameters, Rating, type Card } from "ts-fsrs";
import { fromCard, toCard, type AtomCardFields } from "@/lib/db/fsrs-card";
import type { ReviewRating } from "@/lib/db/types";

/**
 * Le calcul d'échéance, délégué à ts-fsrs : la carte stockée est celle que
 * l'algorithme rend. Seul endroit de l'application qui appelle l'ordonnanceur.
 *
 * Le brouillage (`enable_fuzz`) décale chaque intervalle d'un peu de hasard :
 * des concepts révisés le même jour avec la même note ne reviennent pas tous
 * le même jour, et la charge des sessions se lisse. ts-fsrs le désactive par
 * défaut, d'où le réglage explicite. Le seed (`prisma/seed/replay.ts`) le
 * coupe, pour rester reproductible.
 */

const ordonnanceur = fsrs(generatorParameters({ enable_fuzz: true }));

const NOTES: Record<ReviewRating, Rating.Again | Rating.Hard | Rating.Good | Rating.Easy> = {
  AGAIN: Rating.Again,
  HARD: Rating.Hard,
  GOOD: Rating.Good,
  EASY: Rating.Easy,
};

export type Planification = {
  carte: AtomCardFields;
  /** Jours jusqu'au prochain passage, tels que l'algorithme les a posés. */
  intervalleJours: number;
  stabiliteAvant: number;
  stabiliteApres: number;
};

export function planifier(
  atom: AtomCardFields,
  note: ReviewRating,
  maintenant: Date,
): Planification {
  const avant: Card = toCard(atom);
  const { card } = ordonnanceur.next(avant, maintenant, NOTES[note]);

  return {
    carte: fromCard(card),
    intervalleJours: card.scheduled_days,
    stabiliteAvant: avant.stability,
    stabiliteApres: card.stability,
  };
}
