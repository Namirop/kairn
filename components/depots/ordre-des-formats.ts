import type { VariantFormat } from "@/lib/db/types";

/**
 * Fixe, pour que la vitrine se raconte pareil à chaque dépôt (l'ordre du modèle
 * varie) : du plus immédiat au plus exigeant, puis les formats qu'elle ne
 * génère presque jamais. Le `Record` oblige à placer tout nouveau format.
 */
const RANG_DU_FORMAT: Record<VariantFormat, number> = {
  MCQ: 0,
  TRUE_FALSE: 1,
  CLOZE: 2,
  EXPLAIN: 3,
  SHORT_ANSWER: 4,
  CODE: 5,
};

export function parOrdreDeFormat<T extends { format: VariantFormat }>(questions: T[]): T[] {
  return [...questions].sort((a, b) => RANG_DU_FORMAT[a.format] - RANG_DU_FORMAT[b.format]);
}
