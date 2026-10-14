import { tirageDe } from "./tirage-deterministe";

/**
 * Géométrie d'une jointure entre deux panneaux : une bande de strates (une
 * ligne de coupe et deux veines) plutôt qu'un filet d'un pixel.
 *
 * Le motif ne reprend pas la pierre du cairn : elle reste réservée à ce qui
 * informe. Chaque jointure a sa graine, sinon le même dessin répété redevient un
 * séparateur de gabarit.
 *
 * Unités de viewBox (100 × 10), étirées par `preserveAspectRatio="none"`.
 */

export const LARGEUR_STRATES = 100;
export const HAUTEUR_STRATES = 10;

/** Points de contrôle d'une ligne. Assez pour onduler, pas assez pour vibrer. */
const SEGMENTS = 6;

export type Strates = {
  /** La coupe principale : la surface du dessous, jusqu'en bas de la bande. */
  coupe: string;
  /** Deux veines intermédiaires, du haut vers le bas. */
  veines: [string, string];
};

function arrondi(valeur: number): number {
  return Math.round(valeur * 100) / 100;
}

/** Une ligne qui traverse la bande, ondulée autour de `hauteur`, en courbes lisses. */
function ligne(hauteur: number, amplitude: number, tirage: () => number): string {
  const pas = LARGEUR_STRATES / SEGMENTS;
  const hauteurs = Array.from({ length: SEGMENTS + 1 }, () =>
    arrondi(hauteur + (tirage() * 2 - 1) * amplitude),
  );

  const debut = `M 0 ${hauteurs[0] ?? hauteur}`;
  const courbes = hauteurs.slice(1).map((y, index) => {
    const x = arrondi(pas * (index + 1));
    const precedent = hauteurs[index] ?? hauteur;

    return `C ${arrondi(x - pas * 0.6)} ${precedent} ${arrondi(x - pas * 0.4)} ${y} ${x} ${y}`;
  });

  return [debut, ...courbes].join(" ");
}

/** Ferme une ligne sur le bas de la bande : ce qui est dessous est rempli. */
function jusquenBas(chemin: string): string {
  return `${chemin} L ${LARGEUR_STRATES} ${HAUTEUR_STRATES} L 0 ${HAUTEUR_STRATES} Z`;
}

export function strates(graine: string): Strates {
  const tirage = tirageDe(graine);

  // Chaque ligne ondule un peu moins que celle du dessus. Ne pas réduire
  // l'amplitude : étirée sur un écran large, une ondulation timide redevient un
  // filet droit.
  const premiere = ligne(2.6, 2.2, tirage);
  const seconde = ligne(5.4, 1.8, tirage);
  const troisieme = ligne(7.8, 1.4, tirage);

  return {
    veines: [jusquenBas(premiere), jusquenBas(seconde)],
    coupe: jusquenBas(troisieme),
  };
}
