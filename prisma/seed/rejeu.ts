import { createEmptyCard, fsrs, generatorParameters, Rating, type Card } from "ts-fsrs";
import { depuisLaCarte, type ChampsDeCarte } from "@/lib/db/carte-fsrs";
import type { ReviewRating } from "@/lib/db/types";
import type { AtomDuCorpus } from "./types-du-corpus";

/**
 * Rejoue l'historique déclaré dans le corpus avec ts-fsrs, du plus ancien
 * passage au plus récent, pour que les échéances, stabilités et difficultés du
 * seed soient cohérentes entre elles.
 *
 * Le brouillage aléatoire est coupé : deux exécutions du seed donnent la même base.
 */
const ordonnanceur = fsrs(generatorParameters({ enable_fuzz: false }));

const NOTE = {
  AGAIN: Rating.Again,
  HARD: Rating.Hard,
  GOOD: Rating.Good,
  EASY: Rating.Easy,
} as const satisfies Record<ReviewRating, Rating.Again | Rating.Hard | Rating.Good | Rating.Easy>;

/** Temps de réponse plausible : on hésite plus longtemps quand on ne sait pas. */
const TEMPS_DE_REPONSE_MS: Record<ReviewRating, number> = {
  AGAIN: 14_000,
  HARD: 11_000,
  GOOD: 6_500,
  EASY: 3_200,
};

export type ReviewRejouee = {
  rating: ReviewRating;
  reviewedAt: Date;
  responseTimeMs: number;
  stabilityBefore: number;
  stabilityAfter: number;
  /** Les Variants tournent : c'est le concept qui est planifié, pas la formulation. */
  rangDuVariant: number;
};

export type AtomRejoue = {
  card: ChampsDeCarte;
  reviews: ReviewRejouee[];
};

function joursAvant(reference: Date, jours: number): Date {
  return new Date(reference.getTime() - jours * 24 * 60 * 60 * 1000);
}

export function rejouer(atom: AtomDuCorpus, maintenant: Date): AtomRejoue {
  const nombreDeVariants = Math.max(atom.variants.length, 1);
  const reviews: ReviewRejouee[] = [];
  let card: Card = createEmptyCard(joursAvant(maintenant, atom.historique[0]?.[0] ?? 0));

  atom.historique.forEach(([ilYAJours, rating], rang) => {
    const reviewedAt = joursAvant(maintenant, ilYAJours);
    const stabilityBefore = card.stability;
    card = ordonnanceur.next(card, reviewedAt, NOTE[rating]).card;

    reviews.push({
      rating,
      reviewedAt,
      responseTimeMs: TEMPS_DE_REPONSE_MS[rating] + ((rang * 1_370) % 3_100),
      stabilityBefore,
      stabilityAfter: card.stability,
      rangDuVariant: rang % nombreDeVariants,
    });
  });

  return { card: depuisLaCarte(card), reviews };
}
