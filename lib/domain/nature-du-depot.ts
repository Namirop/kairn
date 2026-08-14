/**
 * Ce qu'un dépôt prétend être, et ce que ça change au doute.
 *
 * `uncertain` marque un concept qui paraît nettement faux, et un concept
 * douteux ne part pas en génération : lui écrire quatre questions riverait une
 * erreur qu'on n'a pas vérifiée. C'est la bonne règle pour une erreur de fait.
 *
 * Elle ne l'est plus dès que l'énoncé n'a pas vocation à être vrai du monde.
 * Quelqu'un qui dépose les règles d'un jeu, la chronologie d'un univers de
 * fiction ou une procédure interne à son équipe obtenait des concepts tous
 * marqués douteux, donc zéro question : le dépôt était accepté, il comptait au
 * quota, et il ne produisait rien. Un chemin mort qui ne disait pas son nom.
 *
 * Sur un dépôt qui n'est pas factuel, la fidélité remplace la vérité — le
 * concept doit être soutenu par ce qui a été déposé, ce que le prompt exige de
 * toute façon, et rien de plus.
 */

export const NATURES_DE_DEPOT = ["FACTUEL", "FICTION", "PERSONNEL"] as const;

export type NatureDuDepot = (typeof NATURES_DE_DEPOT)[number];

/**
 * Les concepts auxquels on écrit des questions.
 *
 * La nature est facultative : une extraction d'avant ce champ, ou un figé du
 * banc écrit avant lui, n'en porte pas. Sans elle on retient `FACTUEL`, qui est
 * le comportement d'origine — un défaut de lecture ne doit pas ouvrir la porte
 * à des questions sur des affirmations douteuses.
 */
export function conceptsAQuestionner<T extends { uncertain: boolean }>(
  concepts: readonly T[],
  nature: NatureDuDepot | null | undefined,
): T[] {
  if (nature !== undefined && nature !== null && nature !== "FACTUEL") return [...concepts];

  return concepts.filter((concept) => !concept.uncertain);
}
