/**
 * Un concept `uncertain` ne reçoit pas de questions, pour ne pas river une erreur
 * de fait. Mais une fiction ou une procédure interne serait alors toute douteuse :
 * hors du factuel, seule compte la fidélité au dépôt, que le prompt exige déjà.
 */

export const NATURES_DE_DEPOT = ["FACTUEL", "FICTION", "PERSONNEL"] as const;

export type NatureDuDepot = (typeof NATURES_DE_DEPOT)[number];

/** Sans nature (anciennes extractions, figés du banc), on retient `FACTUEL` par prudence. */
export function conceptsAQuestionner<T extends { uncertain: boolean }>(
  concepts: readonly T[],
  nature: NatureDuDepot | null | undefined,
): T[] {
  if (nature !== undefined && nature !== null && nature !== "FACTUEL") return [...concepts];

  return concepts.filter((concept) => !concept.uncertain);
}
