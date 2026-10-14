/**
 * Ce qu'un dépôt prétend être, et ce que ça change au doute.
 *
 * Un concept `uncertain` (qui paraît faux) ne reçoit pas de questions, pour ne
 * pas river une erreur de fait. Mais les règles d'un jeu, une fiction ou une
 * procédure interne seraient alors toutes douteuses, et le dépôt compterait au
 * quota sans rien produire. Hors du factuel, seule compte la fidélité au dépôt,
 * que le prompt exige déjà.
 */

export const NATURES_DE_DEPOT = ["FACTUEL", "FICTION", "PERSONNEL"] as const;

export type NatureDuDepot = (typeof NATURES_DE_DEPOT)[number];

/**
 * Les concepts auxquels on écrit des questions. Sans nature (anciennes
 * extractions, figés du banc), on retient `FACTUEL` : un défaut de lecture ne
 * doit pas ouvrir la porte aux affirmations douteuses.
 */
export function conceptsAQuestionner<T extends { uncertain: boolean }>(
  concepts: readonly T[],
  nature: NatureDuDepot | null | undefined,
): T[] {
  if (nature !== undefined && nature !== null && nature !== "FACTUEL") return [...concepts];

  return concepts.filter((concept) => !concept.uncertain);
}
