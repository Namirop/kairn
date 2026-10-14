import { initialiser, type Corps } from "./cairn-physique";
import type { Pierre } from "./cairn-empilement";

/**
 * Le retour du cairn à sa forme : une interpolation, pas une simulation. La
 * chute est de la physique ; la reconstruction est une animation, sans
 * collisions entre pierres qui remontent.
 *
 * Chaque pierre revient à une vitesse proportionnelle à l'écart restant : elles
 * arrivent ensemble.
 */

/** Ce qu'il reste d'écart quand on considère qu'une pierre est rentrée. */
const ARRIVEE = 0.3;
const ARRIVEE_ANGLE = 0.5;
/** Vitesse du rappel, en fraction de l'écart restant par seconde. */
const RAPPEL = 6;
/** Même borne que la simulation : un onglet qui reprend la main ne saute pas. */
const PAS_MAX = 1 / 30;

export function remonter(corps: Corps[], pierres: Pierre[], dt: number): Corps[] {
  const facteur = 1 - Math.exp(-RAPPEL * Math.min(Math.max(dt, 0), PAS_MAX));

  return corps.map((solide, index) => {
    const pierre = pierres[index];
    if (!solide.libre || !pierre) return solide;

    const x = solide.x + (pierre.x - solide.x) * facteur;
    const y = solide.y + (pierre.y - solide.y) * facteur;
    const rotation = solide.rotation + (pierre.rotation - solide.rotation) * facteur;
    const arrive =
      Math.abs(x - pierre.x) < ARRIVEE &&
      Math.abs(y - pierre.y) < ARRIVEE &&
      Math.abs(rotation - pierre.rotation) < ARRIVEE_ANGLE;

    if (arrive) {
      return { ...initialiser([pierre])[0]! };
    }

    return { ...solide, x, y, rotation, vx: 0, vy: 0, vr: 0, repos: false };
  });
}
