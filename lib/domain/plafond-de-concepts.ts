/**
 * Combien de concepts un seul dépôt peut donner, et ce qui arrive au reste.
 *
 * Une contrainte que la grammaire ne fait pas respecter ne doit jamais faire
 * échouer un appel déjà payé : on tronque, on ne rejette pas. Un `.max()` sur la
 * sortie du modèle n'est pour lui qu'une indication (voir
 * `lib/ai/schema-de-sortie.ts`), et le faire tenir par Zod jetait tout le dépôt.
 *
 * La coupe est positionnelle : le modèle rend les concepts dans l'ordre du
 * texte, pas par importance, donc c'est la fin du texte qui part. Une consigne
 * de classement ne tient pas ; la seule défense est un plafond assez haut pour
 * ne pas se déclencher.
 */

/**
 * Une soupape contre l'abus (un glossaire de deux cents entrées), pas une
 * limite de produit. À ~338 signes par concept mesurés, les 16 000 signes de
 * `CARACTERES_MAXIMUM` donnent ~47 concepts.
 *
 * Égal à `PLAFOND_GRATUIT` : un dépôt ne peut pas dépasser à lui seul le mois
 * d'un compte gratuit. Les deux se changent ensemble.
 */
export const PLAFOND_CONCEPTS_PAR_DEPOT = 50;

export type Troncature<T> = {
  /** Ce qu'on garde, dans l'ordre rendu. */
  gardes: T[];
  /** Ce que le modèle avait rendu. Va au journal, jamais à l'écran. */
  rendus: number;
  tronque: boolean;
};

/**
 * Le plafond appliqué à une liste de concepts. `rendus` est conservé même sans
 * coupe : c'est la mesure qui dit si le plafond est à la bonne hauteur.
 */
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
