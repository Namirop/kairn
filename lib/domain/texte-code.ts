/**
 * Découpe d'un texte en parties ordinaires et termes de code.
 *
 * Les concepts et les questions d'un sujet technique citent du code au milieu
 * d'une phrase : un nom de fonction, une directive, un bout de requête. Ils
 * arrivent entourés d'accents graves — la convention que tout le monde écrit,
 * du modèle qui les génère à la personne qui colle une doc. Affichés tels
 * quels, ces accents deviennent de la ponctuation parasite, et le terme qu'ils
 * devaient relever se noie au lieu de ressortir.
 *
 * Fonction pure : elle ne décide de rien du rendu, elle dit seulement ce qui
 * est du code et ce qui n'en est pas.
 */

const MARQUEUR = "`";

export type SegmentDeTexte = {
  /** Vrai pour un terme à relever, faux pour de la prose. */
  code: boolean;
  texte: string;
};

/**
 * Empile en fusionnant : deux morceaux de prose voisins n'ont aucune raison de
 * rester séparés, et un morceau vide n'a rien à rendre.
 */
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
 * Un accent grave ouvre, le suivant ferme.
 *
 * Ce qui n'est pas refermé reste du texte, tel qu'il a été écrit : un accent
 * grave isolé est le plus souvent une citation qu'on n'a pas terminée, et
 * l'avaler ferait disparaître un caractère du dépôt de quelqu'un. Une paire
 * vide reste littérale pour la même raison — il n'y a pas de terme à relever
 * entre deux accents collés.
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
