import { fsrs, Rating, type Card } from "ts-fsrs";
import { fromCard, toCard, type AtomCardFields } from "@/lib/db/fsrs-card";
import type { ReviewRating } from "@/lib/db/types";

/**
 * Le calcul d'échéance, délégué à ts-fsrs.
 *
 * L'algorithme n'est jamais réécrit : on lui passe la carte du concept et la
 * note, il rend une carte, on la stocke telle quelle. Ce fichier est le seul
 * endroit de l'application qui appelle l'ordonnanceur.
 *
 * Le brouillage reste **actif**, contrairement au seed qui le coupe pour être
 * rejouable. Il existe pour éviter qu'un paquet de concepts révisés le même jour
 * revienne le même jour pour toujours : c'est utile en vrai, et seulement gênant
 * quand on veut une base identique à chaque exécution.
 */

const ordonnanceur = fsrs();

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
