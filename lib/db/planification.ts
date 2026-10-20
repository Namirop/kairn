import { fsrs, generatorParameters, Rating, type Card } from "ts-fsrs";
import { depuisLaCarte, versLaCarte, type ChampsDeCarte } from "@/lib/db/carte-fsrs";
import type { ReviewRating } from "@/lib/db/types";

/**
 * Seul appel à l'ordonnanceur ts-fsrs ; la carte stockée est celle qu'il rend.
 * `enable_fuzz`, désactivé par défaut, étale les retours d'une même journée et
 * lisse la charge des sessions. Le seed (`prisma/seed/rejeu.ts`) le coupe.
 */

const ordonnanceur = fsrs(generatorParameters({ enable_fuzz: true }));

const NOTES: Record<ReviewRating, Rating.Again | Rating.Hard | Rating.Good | Rating.Easy> = {
  AGAIN: Rating.Again,
  HARD: Rating.Hard,
  GOOD: Rating.Good,
  EASY: Rating.Easy,
};

export type Planification = {
  carte: ChampsDeCarte;
  /** Tels que l'algorithme les a posés. */
  intervalleJours: number;
  stabiliteAvant: number;
  stabiliteApres: number;
};

export function planifier(
  atom: ChampsDeCarte,
  note: ReviewRating,
  maintenant: Date,
): Planification {
  const avant: Card = versLaCarte(atom);
  const { card } = ordonnanceur.next(avant, maintenant, NOTES[note]);

  return {
    carte: depuisLaCarte(card),
    intervalleJours: card.scheduled_days,
    stabiliteAvant: avant.stability,
    stabiliteApres: card.stability,
  };
}
