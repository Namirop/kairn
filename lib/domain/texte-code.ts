/**
 * Découpe d'un texte en prose et termes de code cités entre accents graves,
 * convention qu'écrivent aussi bien le modèle que la personne qui colle une
 * doc.
 */

const MARQUEUR = "`";

export type SegmentDeTexte = {
  /** Vrai pour un terme à relever, faux pour de la prose. */
  code: boolean;
  texte: string;
};

/** Empile en fusionnant la prose voisine et en ignorant les morceaux vides. */
function empiler(segments: SegmentDeTexte[], texte: string, code: boolean): void {
  if (texte.length === 0) return;

  const dernier = segments[segments.length - 1];

  if (!code && dernier && !dernier.code) {
    dernier.texte += texte;
    return;
  }

  segments.push({ code, texte });
}

/**
 * Un accent grave ouvre, le suivant ferme. Un accent non refermé ou une paire
 * vide reste littéral : l'avaler ferait disparaître un signe du dépôt.
 */
export function segmentsDeCode(texte: string): SegmentDeTexte[] {
  const segments: SegmentDeTexte[] = [];
  let reste = texte;

  while (reste.length > 0) {
    const ouverture = reste.indexOf(MARQUEUR);

    if (ouverture === -1) {
      empiler(segments, reste, false);
      break;
    }

    const fermeture = reste.indexOf(MARQUEUR, ouverture + 1);

    if (fermeture === -1) {
      empiler(segments, reste, false);
      break;
    }

    const dedans = reste.slice(ouverture + 1, fermeture);

    if (dedans.trim().length === 0) {
      empiler(segments, reste.slice(0, fermeture + 1), false);
    } else {
      empiler(segments, reste.slice(0, ouverture), false);
      empiler(segments, dedans, true);
    }

    reste = reste.slice(fermeture + 1);
  }

  return segments;
}

/** Vrai dès qu'un terme de code est cité. Évite un rendu inutile. */
export function porteDuCode(texte: string): boolean {
  return segmentsDeCode(texte).some((segment) => segment.code);
}
