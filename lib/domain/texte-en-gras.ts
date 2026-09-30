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
 * **Le gras se lit avant le code, et il enjambe les termes cités.** Servi le
 * 30/09 : `**Du code Dart à l'APK (\`flutter build apk\`)**` affichait ses quatre
 * astérisques. Le découpage passait d'abord par les accents graves, ce qui
 * laissait la marque ouvrante dans un morceau et la fermante dans un autre —
 * aucun des deux ne voyait sa paire. C'est l'ordre qui était faux : un passage
 * en gras **contient** des termes de code, l'inverse n'arrive pas. Ce module
 * tranche donc en premier, et le découpage des jetons se fait à l'intérieur de
 * ce qu'il rend.
 *
 * Une conséquence, et c'est pourquoi les accents graves sont connus ici : un
 * `**` écrit **dans** un terme cité est du code, pas une emphase. `\`2 ** 3\``
 * reste ce qu'il est.
 *
 * Fonction pure : elle ne décide de rien du rendu, elle dit seulement ce qui est
 * mis en avant et ce qui ne l'est pas.
 */

const MARQUEUR = "**";
const ACCENT = "`";

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
 * Les termes cités entre accents graves, par leurs bornes.
 *
 * Même règle qu'ailleurs : un accent ouvre, le suivant ferme, et ce qui n'est
 * pas refermé n'est pas un terme.
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
 * Une paire ouvre, la suivante ferme.
 *
 * Ce qui n'est pas refermé reste du texte, tel qu'il a été écrit : une paire
 * isolée est le plus souvent une multiplication ou une note en bas de page, et
 * l'avaler ferait disparaître deux signes du dépôt de quelqu'un. Une paire vide
 * reste littérale pour la même raison.
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
