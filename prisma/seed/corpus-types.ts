import type {
  AtomState,
  InputSourceType,
  Langue,
  ReviewRating,
  VariantFacet,
  VariantFormat,
} from "@/lib/db/types";

/** Un passage passé : il y a combien de jours, et avec quelle notation. */
export type SeedReview = readonly [daysAgo: number, rating: ReviewRating];

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

export type SeedVariant = {
  format: VariantFormat;
  /** L'angle interrogé. Les Variants d'un même Atom en portent des différents. */
  facet: VariantFacet;
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
  extractedText?: string;
  /** La langue de ses concepts et questions ; le français par défaut. */
  langue?: Langue;
  createdDaysAgo: number;
  atoms: SeedAtom[];
};
