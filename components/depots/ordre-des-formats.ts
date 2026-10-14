import type { VariantFormat } from "@/lib/db/types";

/**
 * L'ordre dans lequel la vitrine montre les formats, fixe pour que la
 * démonstration se raconte pareil à chaque dépôt (l'ordre du modèle varie).
 *
 * Du plus immédiat au plus exigeant : QCM, vrai ou faux, texte à trou, puis
 * l'explication, la plus lente à lire. `SHORT_ANSWER` et `CODE`, que la vitrine
 * ne génère presque jamais, ferment la marche. Le `Record` sur l'enum oblige à
 * placer tout nouveau format.
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
