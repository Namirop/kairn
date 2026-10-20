import { empiler, tailler, type Empilement } from "@/lib/domain/cairn-empilement";
import { tirageDe } from "@/lib/domain/tirage-deterministe";

/**
 * Le logo sort d'`empiler()` comme le cairn du tableau de bord : symbole,
 * favicon et cairn ne peuvent pas diverger. Des données, jamais du balisage :
 * le composant en fait des classes, l'export des couleurs littérales.
 */

/**
 * Ne change jamais : elle changerait le logo. Choisie pour tenir à 16 px : chaque
 * pierre plus étroite que celle du dessous, 11 % d'écart au moins, 3 %
 * d'inclinaison au plus, un rapport de 0,80 qui remplit un carré d'icône.
 */
export const GRAINE_DU_LOGO = "kairn-logo";

/** Le rang dans la graine : les densités 3 et 5 partagent leurs trois premières pierres. */
export function grainesDuLogo(nombre: number): string[] {
  return Array.from({ length: nombre }, (_, rang) => `${GRAINE_DU_LOGO}-${rang}`);
}

export const PIERRES_DENSE = 5;
export const PIERRES_REDUITE = 3;

/** En dessous, trois pierres : à 16 px, cinq étages ne se distinguent plus. */
export const SEUIL_SYMBOLE_DENSE = 64;

export function densiteDuSymbole(tailleEnPx: number): number {
  return tailleEnPx >= SEUIL_SYMBOLE_DENSE ? PIERRES_DENSE : PIERRES_REDUITE;
}

export function empilementDuLogo(pierres: number): Empilement {
  return empiler(pierres, grainesDuLogo(pierres));
}

/**
 * Cadre serré plutôt que la vue d'`empiler()`, dont le vide latéral (pour la
 * chute) décalerait ce qui touche le symbole. Une unité absorbe l'inclinaison.
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
 * Imposée par le rang, sombre en bas : le tirage d'`empiler()` convient au cairn,
 * pas à une marque. Le sommet, lichen, ne passe pas par ici.
 */
export function nuanceDuRang(rang: number, total: number): 0 | 1 | 2 {
  if (total <= 1) return 0;

  const part = rang / (total - 1);

  if (part < 0.25) return 0;
  if (part < 0.75) return 1;

  return 2;
}

/**
 * Le point du i, taillé comme les autres : un rectangle arrondi se lirait
 * « puce ». Centré sur l'origine ; l'appelant le pose.
 */
export const COTE_DU_POINT = 10;

export function pierreDuPoint(): string {
  return tailler(COTE_DU_POINT, COTE_DU_POINT * 0.86, tirageDe(`${GRAINE_DU_LOGO}-point`));
}
