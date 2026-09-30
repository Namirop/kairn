/**
 * Ce que vaut chaque surface en clarté, sur cent.
 *
 * **Une valeur, pas une teinte.** C'est ce qui permet à ce fichier d'être dans
 * le domaine : la clarté relative des quatre surfaces ne change pas quand la
 * palette change. Le papier reste ce qu'il y a de plus clair, la roche ce qu'il
 * y a de plus sombre, et l'ombre se tient juste sous le papier — c'est la
 * définition même de ces quatre rôles, pas une propriété de leurs couleurs
 * actuelles. Une palette qui inverserait cet ordre ne serait plus la même
 * composition.
 *
 * Les nombres sont les luminances relatives mesurées sur les jetons de
 * `globals.css`, arrondies : `#f2f2ef` donne 0,90, `#e4e4df` 0,77, `#e8eadf`
 * 0,80 et `#2a2e2c` 0,03. Ramenées sur cent et espacées comme elles le sont
 * vraiment, elles disent ce que ce module a besoin de savoir : qui est loin de
 * qui.
 *
 * Le seul usage aujourd'hui est `fondu-de-passage.ts`, qui en déduit de combien
 * une couleur doit tourner avant qu'une strate se pose.
 */

export type Surface = "papier" | "ombre" | "lichen" | "roche";

export const VALEURS: Record<Surface, number> = {
  papier: 95,
  ombre: 89,
  lichen: 90,
  roche: 17,
};
