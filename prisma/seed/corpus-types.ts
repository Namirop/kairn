import type { AtomState, InputSourceType, ReviewRating, VariantFormat } from "@/lib/db/types";

/** Un passage passé : il y a combien de jours, et avec quelle notation. */
export type SeedReview = readonly [daysAgo: number, rating: ReviewRating];

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

export type SeedVariant = {
  format: VariantFormat;
  question: string;
  answerKey: string;
  /** Options d'un QCM, langage d'un extrait de code. */
  payload?: { [key: string]: JsonValue };
};

export type SeedAtom = {
  concept: string;
  tags: string[];
  state: AtomState;
  /** Rejoué par ts-fsrs du plus ancien au plus récent : c'est lui qui fixe
   *  l'échéance, la stabilité et la difficulté. Rien n'est écrit à la main. */
  history: SeedReview[];
  archivedDaysAgo?: number;
  variants: SeedVariant[];
};

export type SeedInput = {
  rawContent: string;
  sourceType: InputSourceType;
  imageUrl?: string;
  extractedText?: string;
  createdDaysAgo: number;
  atoms: SeedAtom[];
};
