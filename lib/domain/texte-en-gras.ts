/**
 * Découpe d'un texte en parties ordinaires et parties mises en avant.
 *
 * Le pendant de `texte-code.ts`, pour l'autre marqueur qu'un dépôt porte
 * toujours : deux astérisques autour de ce que l'auteur voulait souligner.
 * Affichés tels quels, ils devenaient de la ponctuation parasite — `**En
 * bref**` — et le mot qu'ils devaient relever se noyait au lieu de ressortir.
 *
 * **Deux astérisques, jamais un.** L'italique d'un seul astérisque coûterait
 * plus qu'il ne rapporte : c'est aussi la marque d'une puce en tête de ligne, il
 * apparaît seul dans des expressions et des formules, et le confondre abîmerait
 * un texte déposé. Le gras, lui, ne s'écrit pas par accident.
 *
 * Fonction pure : elle ne décide de rien du rendu, elle dit seulement ce qui est
 * mis en avant et ce qui ne l'est pas.
 */

const MARQUEUR = "**";

export type SegmentDeTexte = {
  /** Vrai pour une partie mise en avant, faux pour le reste. */
  gras: boolean;
  texte: string;
};

/**
 * Empile en fusionnant : deux parties ordinaires voisines n'ont aucune raison
 * de rester séparées, et une partie vide n'a rien à rendre.
 */
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
 * Une paire ouvre, la suivante ferme.
 *
 * Ce qui n'est pas refermé reste du texte, tel qu'il a été écrit : une paire
 * isolée est le plus souvent une multiplication ou une note en bas de page, et
 * l'avaler ferait disparaître deux signes du dépôt de quelqu'un. Une paire vide
 * reste littérale pour la même raison.
 */
export function segmentsEnGras(texte: string): SegmentDeTexte[] {
  const segments: SegmentDeTexte[] = [];
  let reste = texte;

  while (reste.length > 0) {
    const ouverture = reste.indexOf(MARQUEUR);
    const fermeture = ouverture === -1 ? -1 : reste.indexOf(MARQUEUR, ouverture + MARQUEUR.length);

    if (fermeture === -1) {
      empiler(segments, reste, false);
      break;
    }

    const dedans = reste.slice(ouverture + MARQUEUR.length, fermeture);

    empiler(segments, reste.slice(0, ouverture), false);

    if (dedans.trim().length === 0) empiler(segments, `${MARQUEUR}${dedans}${MARQUEUR}`, false);
    else empiler(segments, dedans, true);

    reste = reste.slice(fermeture + MARQUEUR.length);
  }

  return segments;
}
