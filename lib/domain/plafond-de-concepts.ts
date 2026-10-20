/**
 * Combien de concepts un seul dépôt peut donner. On tronque, on ne rejette pas :
 * un `.max()` n'est qu'une indication pour le modèle (`lib/ai/schema-de-sortie.ts`),
 * et le faire tenir par Zod jetterait un dépôt payé. Le modèle suit l'ordre du
 * texte, donc c'est la fin qui part : la seule défense est un plafond assez haut
 * pour ne pas se déclencher.
 */

/**
 * Une soupape contre l'abus, pas une limite de produit : ~338 signes mesurés par
 * concept font ~47 concepts dans `CARACTERES_MAXIMUM`. Égal à `PLAFOND_GRATUIT`,
 * avec qui il se change : un dépôt ne dépasse pas le mois d'un compte gratuit.
 */
export const PLAFOND_CONCEPTS_PAR_DEPOT = 50;

export type Troncature<T> = {
  /** Ce qu'on garde, dans l'ordre rendu. */
  gardes: T[];
  /** Ce que le modèle avait rendu. Va au journal, jamais à l'écran. */
  rendus: number;
  tronque: boolean;
};

/** `rendus` est conservé même sans coupe : il dit si le plafond est à la bonne hauteur. */
export function appliquerLePlafond<T>(
  concepts: readonly T[],
  plafond: number = PLAFOND_CONCEPTS_PAR_DEPOT,
): Troncature<T> {
  return {
    gardes: concepts.slice(0, plafond),
    rendus: concepts.length,
    tronque: concepts.length > plafond,
  };
}
