import { empiler, tailler, type Empilement } from "@/lib/domain/cairn-empilement";
import { tirageDe } from "@/lib/domain/tirage-deterministe";

/**
 * La géométrie de la marque, dérivée de celle du cairn : le logo sort
 * d'`empiler()` comme le cairn du tableau de bord, pour que symbole, pastille,
 * favicon et cairn ne puissent pas diverger.
 *
 * Ce module rend des données, jamais du balisage : le composant les traduit en
 * classes Tailwind, le script d'export en couleurs littérales (un `.png` ne lit
 * pas une variable CSS).
 */

/**
 * La graine du logo. Elle ne change jamais : elle changerait le logo.
 *
 * Choisie pour tenir à seize pixels : chaque pierre plus étroite que celle du
 * dessous, au moins 11 % d'écart entre voisines, 3 % d'inclinaison au plus, et
 * un rapport hauteur/largeur de 0,80 qui remplit un carré d'icône.
 */
export const GRAINE_DU_LOGO = "kairn-logo";

/**
 * Les graines des `nombre` premières pierres.
 *
 * Le rang est dans la graine : les densités 3 et 5 partagent leurs trois
 * premières silhouettes, c'est le même logo à densité réduite.
 */
export function grainesDuLogo(nombre: number): string[] {
  return Array.from({ length: nombre }, (_, rang) => `${GRAINE_DU_LOGO}-${rang}`);
}

/** Les deux densités du symbole. */
export const PIERRES_DENSE = 5;
export const PIERRES_REDUITE = 3;

/**
 * En dessous, le symbole passe à trois pierres : à seize pixels, cinq étages
 * ne se distinguent plus.
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
 * Le cadre serré sur les pierres, et non la vue d'`empiler()` : celle-ci garde
 * du vide sur les côtés pour la chute des pierres, qui décalerait tout ce qui
 * touche le symbole.
 *
 * Une unité de jeu de chaque côté absorbe l'inclinaison des pierres (moins
 * d'une unité à 3,5°).
 */
const JEU = 1;

export type CadreDuSymbole = { x: number; y: number; largeur: number; hauteur: number };

export function cadreDuSymbole(pierres: number): CadreDuSymbole {
  const empilement = empilementDuLogo(pierres);
  const bords = empilement.pierres.flatMap((pierre) => [
    pierre.x - pierre.largeur / 2,
    pierre.x + pierre.largeur / 2,
  ]);

  const gauche = Math.min(...bords) - JEU;
  const droite = Math.max(...bords) + JEU;

  return {
    x: gauche,
    y: -empilement.hauteur + empilement.ySol,
    largeur: droite - gauche,
    hauteur: empilement.hauteur,
  };
}

/**
 * La nuance d'une pierre du logo, imposée par le rang : sombre en bas, plus
 * claire en montant. `empiler()` la tire au hasard, ce qui convient au cairn
 * mais pas à une marque. Le sommet ne passe pas par ici : il est lichen.
 */
export function nuanceDuRang(rang: number, total: number): 0 | 1 | 2 {
  if (total <= 1) return 0;

  const part = rang / (total - 1);

  if (part < 0.25) return 0;
  if (part < 0.75) return 1;

  return 2;
}

/**
 * La pierre qui remplace le point du i, taillée par `tailler()` comme les
 * autres : un rectangle arrondi se lirait « puce » plutôt que « pierre ».
 * Chemin centré sur l'origine, boîte de 10 sur 10 ; l'appelant la pose.
 */
export const COTE_DU_POINT = 10;

export function pierreDuPoint(): string {
  return tailler(COTE_DU_POINT, COTE_DU_POINT * 0.86, tirageDe(`${GRAINE_DU_LOGO}-point`));
}
