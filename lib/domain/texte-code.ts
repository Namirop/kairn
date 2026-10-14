import { fusionnerLaProse, type MorceauMarque } from "./segments-fusionnes";

/**
 * Découpe d'un texte en prose et termes de code cités entre accents graves,
 * convention qu'écrivent aussi bien le modèle que la personne qui colle une
 * doc.
 */

const MARQUEUR = "`";

export type SegmentDeCode = {
  /** Vrai pour un terme à relever, faux pour de la prose. */
  code: boolean;
  texte: string;
};

/**
 * Un accent grave ouvre, le suivant ferme. Un accent non refermé ou une paire
 * vide reste littéral : l'avaler ferait disparaître un signe du dépôt.
 */
export function segmentsDeCode(texte: string): SegmentDeCode[] {
  const morceaux: MorceauMarque[] = [];
  let reste = texte;

  while (reste.length > 0) {
    const ouverture = reste.indexOf(MARQUEUR);

    if (ouverture === -1) {
      morceaux.push({ marque: false, texte: reste });
      break;
    }

    const fermeture = reste.indexOf(MARQUEUR, ouverture + 1);

    if (fermeture === -1) {
      morceaux.push({ marque: false, texte: reste });
      break;
    }

    const dedans = reste.slice(ouverture + 1, fermeture);

    if (dedans.trim().length === 0) {
      morceaux.push({ marque: false, texte: reste.slice(0, fermeture + 1) });
    } else {
      morceaux.push({ marque: false, texte: reste.slice(0, ouverture) });
      morceaux.push({ marque: true, texte: dedans });
    }

    reste = reste.slice(fermeture + 1);
  }

  return fusionnerLaProse(morceaux).map(({ marque, texte }) => ({ code: marque, texte }));
}
