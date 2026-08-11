/**
 * Géométrie d'une jointure entre deux panneaux : une coupe de roche.
 *
 * Deux panneaux ne se séparent plus par un filet d'un pixel — c'est ce trait-là
 * qui faisait lire l'application comme un article. Ils se séparent par une
 * bande de strates : la surface du dessus s'arrête sur une ligne irrégulière,
 * deux veines intermédiaires marquent le passage, et la surface du dessous
 * commence.
 *
 * Le motif ne reprend pas la pierre du cairn, et c'est délibéré : la pierre
 * doit rester informative — le cairn, le compteur de session, les états vides.
 * L'étendre à la décoration de chaque jointure la viderait de son sens.
 *
 * Fonction pure : même graine, même coupe, pour toujours. Chaque jointure a la
 * sienne, sinon la répétition du même dessin en ferait un séparateur de
 * gabarit, ce qu'on vient justement d'enlever.
 *
 * Les coordonnées sont en unités de viewBox : largeur 100, hauteur 10, étirées
 * à la largeur réelle par `preserveAspectRatio="none"`.
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

function empreinte(graine: string): number {
  let hash = 0x811c9dc5;

  for (let index = 0; index < graine.length; index += 1) {
    hash ^= graine.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return hash >>> 0;
}

/** Générateur mulberry32, le même que celui du cairn. */
function generateur(etat: number): () => number {
  let courant = etat;

  return () => {
    courant = (courant + 0x6d2b79f5) >>> 0;
    let melange = Math.imul(courant ^ (courant >>> 15), 1 | courant);
    melange = (melange + Math.imul(melange ^ (melange >>> 7), 61 | melange)) ^ melange;

    return ((melange ^ (melange >>> 14)) >>> 0) / 4294967296;
  };
}

function arrondi(valeur: number): number {
  return Math.round(valeur * 100) / 100;
}

/**
 * Une ligne qui traverse la bande, ondulée autour de `hauteur`.
 *
 * Les points sont reliés par des courbes lisses plutôt que par des segments :
 * une roche sédimentaire n'a pas d'angles, elle a des plis.
 */
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
  const tirage = generateur(empreinte(graine));

  // Les trois lignes descendent, et chacune ondule un peu moins que la
  // précédente : la couche du dessus est celle qui a été le plus attaquée.
  //
  // L'amplitude compte plus qu'on ne croit. Étirée sur un écran large, une
  // ondulation timide redevient exactement le filet qu'on a enlevé partout — il
  // faut que le pli se voie à deux mètres de l'écran.
  const premiere = ligne(2.6, 2.2, tirage);
  const seconde = ligne(5.4, 1.8, tirage);
  const troisieme = ligne(7.8, 1.4, tirage);

  return {
    veines: [jusquenBas(premiere), jusquenBas(seconde)],
    coupe: jusquenBas(troisieme),
  };
}
