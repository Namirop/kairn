import { empiler, tailler, type Empilement } from "@/lib/domain/cairn-stack";
import { tirageDe } from "@/lib/domain/tirage-deterministe";

/**
 * La géométrie de la marque, dérivée de celle du cairn et de rien d'autre.
 *
 * **Le logo n'est pas redessiné à côté du produit, il est appelé.** C'est la
 * seule construction qui garantisse que le symbole de l'en-tête, la pastille
 * d'application, la favicon et le cairn du tableau de bord ne puissent pas
 * diverger : ils sortent tous d'`empiler()`. Le jour où la taille des pierres est
 * retouchée, tout suit sans qu'on ouvre un outil de dessin.
 *
 * Ce module rend des **données**, jamais du balisage. Le composant les traduit en
 * classes Tailwind, le script d'export en couleurs littérales — parce qu'un
 * fichier `.png` ne sait pas lire une variable CSS. Deux traductions d'une même
 * géométrie, et non deux géométries.
 *
 * Rien ici n'est testé, et c'est délibéré : tout y est soit une constante, soit
 * une projection totale d'un entier sur trois valeurs. Il n'y a pas de cas limite
 * à couvrir qu'un coup d'œil à l'écran ne trancherait pas mieux.
 */

/**
 * La graine du logo. **Elle ne change jamais : elle changerait le logo.**
 *
 * Choisie sur planche parmi une douzaine de candidates, et la seule à tenir les
 * trois critères d'un symbole qui doit vivre à seize pixels : l'affinement est
 * monotone — chaque pierre est plus étroite que celle du dessous, sans exception —,
 * le plus faible écart de largeur entre deux voisines fait onze pour cent, et
 * l'empilement ne penche que de trois pour cent de sa base. Partout ailleurs, ou
 * bien une pierre s'élargissait en montant, ou bien deux voisines se confondaient
 * dans la favicon.
 *
 * Son rapport hauteur/largeur de 0,80 rentre dans un carré d'icône sans marge
 * perdue.
 */
export const GRAINE_DU_LOGO = "kairn-logo";

/**
 * Les graines des `nombre` premières pierres.
 *
 * Le rang est dans la graine, donc `empiler(3)` et `empiler(5)` partagent leurs
 * trois premières pierres : mêmes silhouettes, seule la largeur se recalcule
 * parce que l'affinement se répartit sur moins d'étages. Ce n'est pas un second
 * logo, c'est le même à densité réduite.
 */
export function grainesDuLogo(nombre: number): string[] {
  return Array.from({ length: nombre }, (_, rang) => `${GRAINE_DU_LOGO}-${rang}`);
}

/** Les deux densités du symbole. */
export const PIERRES_DENSE = 5;
export const PIERRES_REDUITE = 3;

/**
 * En dessous, le symbole passe à trois pierres.
 *
 * À seize pixels, cinq étages font quatre pixels chacun : il n'y a plus
 * d'empilement, il y a un pâté. Trois pierres tiennent jusqu'en bas parce que
 * chaque étage garde de quoi se distinguer du suivant.
 */
export const SEUIL_SYMBOLE_DENSE = 64;

export function densiteDuSymbole(tailleEnPx: number): number {
  return tailleEnPx >= SEUIL_SYMBOLE_DENSE ? PIERRES_DENSE : PIERRES_REDUITE;
}

/** L'empilement du logo, à la densité demandée. */
export function empilementDuLogo(pierres: number): Empilement {
  return empiler(pierres, grainesDuLogo(pierres));
}

/**
 * La nuance d'une pierre du logo, imposée par le rang.
 *
 * `empiler()` tire la nuance au hasard, ce qui est juste pour le cairn du tableau
 * de bord — c'est ce qui rend chaque empilement personnel. Un logo demande
 * l'inverse : une dégradation franche, la plus sombre en bas, en s'éclaircissant
 * vers le haut. Trois pierres sombres qui se suivent, dans une marque, ressemblent
 * à un bug.
 *
 * Le rang du sommet ne passe pas par ici : il est entièrement lichen.
 */
export function nuanceDuRang(rang: number, total: number): 0 | 1 | 2 {
  if (total <= 1) return 0;

  const part = rang / (total - 1);

  if (part < 0.25) return 0;
  if (part < 0.75) return 1;

  return 2;
}

/**
 * La pierre qui remplace le point du i, taillée comme les autres.
 *
 * Elle occupe la place optique du point : sa boîte est carrée, et c'est
 * l'appelant qui la pose. `tailler()` plutôt qu'un rectangle arrondi, sinon elle
 * jure avec les cinq de l'empilement — l'irrégularité des flancs et des coins est
 * exactement ce qui fait lire « pierre » plutôt que « puce ».
 *
 * Le chemin est centré sur l'origine, dans une boîte de 10 sur 10.
 */
export const COTE_DU_POINT = 10;

export function pierreDuPoint(): string {
  return tailler(COTE_DU_POINT, COTE_DU_POINT * 0.86, tirageDe(`${GRAINE_DU_LOGO}-point`));
}
