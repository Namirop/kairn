import type { Boite, Vecteur } from "./cairn-collision";

/**
 * La cinématique d'un solide en deux dimensions : ce qu'une impulsion change à
 * la vitesse et à la rotation d'une pierre. Le choix de l'impulsion vit dans
 * `cairn-resolution`.
 *
 * Le terme de rotation fait basculer une pierre heurtée par un coin au lieu de
 * la faire glisser à plat.
 */

export type Mobile = {
  boite: Boite;
  vx: number;
  vy: number;
  /** Degrés par seconde. */
  vr: number;
  /** Nulle pour ce qui ne bouge pas : le sol, les bords, le socle du cairn. */
  masseInverse: number;
  inertieInverse: number;
};

/** Un corps immobile de masse infinie, à opposer au sol et aux bords. */
export function monde(): Mobile {
  return {
    boite: { x: 0, y: 0, rotation: 0, largeur: 0, hauteur: 0 },
    vx: 0,
    vy: 0,
    vr: 0,
    masseInverse: 0,
    inertieInverse: 0,
  };
}

/** Vitesse d'un point du solide : celle du centre, plus celle de la rotation. */
export function vitesseAuPoint(mobile: Mobile, point: Vecteur): Vecteur {
  const omega = (mobile.vr * Math.PI) / 180;
  const rx = point.x - mobile.boite.x;
  const ry = point.y - mobile.boite.y;

  return { x: mobile.vx - omega * ry, y: mobile.vy + omega * rx };
}

/** Applique une impulsion en un point. Sans effet sur ce qui ne bouge pas. */
export function appliquer(mobile: Mobile, point: Vecteur, jx: number, jy: number): void {
  if (mobile.masseInverse === 0) return;

  const rx = point.x - mobile.boite.x;
  const ry = point.y - mobile.boite.y;

  mobile.vx += jx * mobile.masseInverse;
  mobile.vy += jy * mobile.masseInverse;
  mobile.vr += ((rx * jy - ry * jx) * mobile.inertieInverse * 180) / Math.PI;
}

/**
 * L'inverse de la masse effective d'un contact le long d'un axe, rotations
 * comprises : la vitesse relative gagnée par unité d'impulsion. Elle croît
 * quand on pousse loin du centre, parce que la pierre peut tourner au lieu de
 * résister.
 */
export function masseEffectiveInverse(a: Mobile, b: Mobile, point: Vecteur, axe: Vecteur): number {
  const bras = (mobile: Mobile) =>
    (point.x - mobile.boite.x) * axe.y - (point.y - mobile.boite.y) * axe.x;
  const brasA = bras(a);
  const brasB = bras(b);

  return (
    a.masseInverse +
    b.masseInverse +
    brasA * brasA * a.inertieInverse +
    brasB * brasB * b.inertieInverse
  );
}
