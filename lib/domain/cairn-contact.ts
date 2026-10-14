import type { Corps } from "./cairn-physique";
import type { Pierre } from "./cairn-empilement";

/**
 * Détection du geste sur l'empilement : ce que le pointeur a touché. La chute
 * relève de la simulation (`cairn-physique.ts`).
 */

/** Points testés le long du segment parcouru entre deux images. */
const ECHANTILLONS = 6;

/**
 * Marge ajoutée autour de chaque pierre, en unités de viewBox. Les pierres ont
 * un léger jeu vertical : sans marge, un balayage horizontal passerait dans un
 * interstice sans rien renverser.
 */
const TOLERANCE = 1.5;

export type Point = { x: number; y: number };

/** Test de contact dans le repère propre de la pierre, rotation défaite. */
function contient(solide: Corps, pierre: Pierre, point: Point): boolean {
  const angle = (-solide.rotation * Math.PI) / 180;
  const dx = point.x - solide.x;
  const dy = point.y - solide.y;
  const localX = dx * Math.cos(angle) - dy * Math.sin(angle);
  const localY = dx * Math.sin(angle) + dy * Math.cos(angle);

  return (
    Math.abs(localX) <= pierre.largeur / 2 + TOLERANCE &&
    Math.abs(localY) <= pierre.hauteur / 2 + TOLERANCE
  );
}

/**
 * Pierre traversée par le segment, la plus haute d'abord.
 *
 * On teste le segment, pas le point d'arrivée : un geste rapide saute d'une
 * image à l'autre et traverserait une pierre sans la toucher.
 */
export function pierreTraversee(
  corps: Corps[],
  pierres: Pierre[],
  depuis: Point,
  vers: Point,
): number | null {
  for (let index = corps.length - 1; index >= 0; index -= 1) {
    const solide = corps[index];
    const pierre = pierres[index];
    if (!solide || !pierre || solide.libre) continue;

    for (let pas = 0; pas <= ECHANTILLONS; pas += 1) {
      const t = pas / ECHANTILLONS;
      const point = {
        x: depuis.x + (vers.x - depuis.x) * t,
        y: depuis.y + (vers.y - depuis.y) * t,
      };

      if (contient(solide, pierre, point)) return index;
    }
  }

  return null;
}
