import type { Boite, Vecteur } from "./cairn-collision";

/**
 * Ce qu'est un corps mobile, et ce qu'une impulsion lui fait.
 *
 * La cinématique d'un solide en deux dimensions, et rien d'autre : où va un
 * point de la pierre, ce qu'une impulsion change à sa vitesse et à sa rotation,
 * et quelle masse elle oppose le long d'une direction donnée. Décider **quelle**
 * impulsion appliquer est un autre sujet — c'est `cairn-resolution`.
 *
 * Une impulsion posée loin du centre fait tourner autant qu'elle pousse : c'est
 * ce bras de levier qui fait basculer une pierre heurtée par un coin plutôt que
 * de la faire glisser à plat. Sans le terme de rotation, un éboulis n'est qu'un
 * jeu de palets.
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
 * Masse effective d'un contact le long d'un axe, rotations comprises.
 *
 * C'est ce qu'il faut d'impulsion pour gagner une unité de vitesse relative à
 * cet endroit-là. Une pierre poussée près de son centre oppose sa masse ; la
 * même poussée à son extrémité en oppose bien moins, parce qu'elle peut tourner
 * au lieu de résister.
 */
export function masseEffective(a: Mobile, b: Mobile, point: Vecteur, axe: Vecteur): number {
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
