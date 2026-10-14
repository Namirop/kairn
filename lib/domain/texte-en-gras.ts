/**
 * Découpe d'un texte en parties ordinaires et parties mises en avant.
 *
 * Le pendant de `texte-code.ts` pour le gras `**…**`.
 *
 * Deux astérisques, jamais un : un astérisque seul marque aussi une puce ou
 * apparaît dans une formule, et le confondre abîmerait un texte déposé.
 *
 * Le gras se découpe avant le code, car un passage en gras contient des termes
 * cités et pas l'inverse : découper d'abord sur les accents graves sépare les
 * deux marques d'une paire. Un `**` écrit dans un terme cité reste du code
 * (`\`2 ** 3\``), d'où la connaissance des accents graves ici.
 */

const MARQUEUR = "**";
const ACCENT = "`";

export type SegmentDeTexte = {
  /** Vrai pour une partie mise en avant, faux pour le reste. */
  gras: boolean;
  texte: string;
};

/** Empile en fusionnant les parties ordinaires voisines et en ignorant les vides. */
function empiler(segments: SegmentDeTexte[], texte: string, gras: boolean): void {
  if (texte.length === 0) return;

  const dernier = segments[segments.length - 1];

  if (!gras && dernier && !dernier.gras) {
    dernier.texte += texte;
    return;
  }

  segments.push({ gras, texte });
}

/**
 * Les bornes des termes cités : un accent grave ouvre, le suivant ferme, et ce
 * qui n'est pas refermé n'est pas un terme (même règle que `texte-code.ts`).
 */
function termesCites(texte: string): { debut: number; fin: number }[] {
  const places: { debut: number; fin: number }[] = [];
  let ouverture = texte.indexOf(ACCENT);

  while (ouverture !== -1) {
    const fermeture = texte.indexOf(ACCENT, ouverture + 1);

    if (fermeture === -1) break;

    places.push({ debut: ouverture, fin: fermeture });
    ouverture = texte.indexOf(ACCENT, fermeture + 1);
  }

  return places;
}

/** La marque suivante qui ne tombe pas dans un terme cité. */
function marqueSuivante(
  texte: string,
  depuis: number,
  cites: readonly { debut: number; fin: number }[],
): number {
  let place = texte.indexOf(MARQUEUR, depuis);

  while (place !== -1 && cites.some((cite) => place > cite.debut && place < cite.fin)) {
    place = texte.indexOf(MARQUEUR, place + MARQUEUR.length);
  }

  return place;
}

/**
 * Une paire ouvre, la suivante ferme. Une paire non refermée ou vide reste
 * littérale : c'est le plus souvent une puissance ou une note, et l'avaler
 * ferait disparaître des signes du dépôt.
 */
export function segmentsEnGras(texte: string): SegmentDeTexte[] {
  const cites = termesCites(texte);
  const segments: SegmentDeTexte[] = [];
  let curseur = 0;

  while (curseur < texte.length) {
    const ouverture = marqueSuivante(texte, curseur, cites);
    const fermeture =
      ouverture === -1 ? -1 : marqueSuivante(texte, ouverture + MARQUEUR.length, cites);

    if (fermeture === -1) break;

    const dedans = texte.slice(ouverture + MARQUEUR.length, fermeture);

    empiler(segments, texte.slice(curseur, ouverture), false);

    if (dedans.trim().length === 0) empiler(segments, `${MARQUEUR}${dedans}${MARQUEUR}`, false);
    else empiler(segments, dedans, true);

    curseur = fermeture + MARQUEUR.length;
  }

  empiler(segments, texte.slice(curseur), false);

  return segments;
}
