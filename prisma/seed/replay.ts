import { createEmptyCard, fsrs, generatorParameters, Rating, type Card } from "ts-fsrs";
import { fromCard, type AtomCardFields } from "@/lib/db/fsrs-card";
import type { ReviewRating } from "@/lib/db/types";
import type { SeedAtom } from "./corpus-types";

/**
 * Rejoue l'historique déclaré dans le corpus avec ts-fsrs, du plus ancien
 * passage au plus récent, pour que les échéances, stabilités et difficultés du
 * seed soient cohérentes entre elles.
 *
 * Le brouillage aléatoire est coupé : deux exécutions du seed donnent la même base.
 */
const scheduler = fsrs(generatorParameters({ enable_fuzz: false }));

const GRADE = {
  AGAIN: Rating.Again,
  HARD: Rating.Hard,
  GOOD: Rating.Good,
  EASY: Rating.Easy,
} as const satisfies Record<ReviewRating, Rating.Again | Rating.Hard | Rating.Good | Rating.Easy>;

/** Temps de réponse plausible : on hésite plus longtemps quand on ne sait pas. */
const BASE_RESPONSE_MS: Record<ReviewRating, number> = {
  AGAIN: 14_000,
  HARD: 11_000,
  GOOD: 6_500,
  EASY: 3_200,
};

export type ReplayedReview = {
  rating: ReviewRating;
  reviewedAt: Date;
  responseTimeMs: number;
  stabilityBefore: number;
  stabilityAfter: number;
  /** Les Variants tournent : c'est le concept qui est planifié, pas la formulation. */
  variantIndex: number;
};

export type ReplayedAtom = {
  card: AtomCardFields;
  reviews: ReplayedReview[];
};

function daysBefore(reference: Date, days: number): Date {
  return new Date(reference.getTime() - days * 24 * 60 * 60 * 1000);
}

export function replay(atom: SeedAtom, now: Date): ReplayedAtom {
  const variantCount = Math.max(atom.variants.length, 1);
  const reviews: ReplayedReview[] = [];
  let card: Card = createEmptyCard(daysBefore(now, atom.history[0]?.[0] ?? 0));

  atom.history.forEach(([daysAgo, rating], index) => {
    const reviewedAt = daysBefore(now, daysAgo);
    const stabilityBefore = card.stability;
    card = scheduler.next(card, reviewedAt, GRADE[rating]).card;

    reviews.push({
      rating,
      reviewedAt,
      responseTimeMs: BASE_RESPONSE_MS[rating] + ((index * 1_370) % 3_100),
      stabilityBefore,
      stabilityAfter: card.stability,
      variantIndex: index % variantCount,
    });
  });

  return { card: fromCard(card), reviews };
}
