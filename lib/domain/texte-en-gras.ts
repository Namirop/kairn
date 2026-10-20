import { fusionnerLaProse, type MorceauMarque } from "./segments-fusionnes";

/**
 * Le pendant de `texte-code.ts` pour le gras `**…**`. Deux astérisques, jamais
 * un : un seul marque aussi une puce ou une formule. Le gras se découpe avant le
 * code, un passage en gras contenant des termes cités et pas l'inverse ; un `**`
 * dans un terme cité (`\`2 ** 3\``) reste du code, d'où les accents graves ici.
 */

const MARQUEUR = "**";
const ACCENT = "`";

export type SegmentEnGras = {
  gras: boolean;
  texte: string;
};

/** Même règle que `texte-code.ts` : ce qui n'est pas refermé n'est pas un terme. */
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
 * Une paire non refermée ou vide reste littérale : le plus souvent une puissance
 * ou une note, que l'avaler ferait disparaître du dépôt.
 */
export function segmentsEnGras(texte: string): SegmentEnGras[] {
  const cites = termesCites(texte);
  const morceaux: MorceauMarque[] = [];
  let curseur = 0;

  while (curseur < texte.length) {
    const ouverture = marqueSuivante(texte, curseur, cites);
    const fermeture =
      ouverture === -1 ? -1 : marqueSuivante(texte, ouverture + MARQUEUR.length, cites);

    if (fermeture === -1) break;

    const dedans = texte.slice(ouverture + MARQUEUR.length, fermeture);

    morceaux.push({ marque: false, texte: texte.slice(curseur, ouverture) });

    morceaux.push(
      dedans.trim().length === 0
        ? { marque: false, texte: `${MARQUEUR}${dedans}${MARQUEUR}` }
        : { marque: true, texte: dedans },
    );

    curseur = fermeture + MARQUEUR.length;
  }

  morceaux.push({ marque: false, texte: texte.slice(curseur) });

  return fusionnerLaProse(morceaux).map(({ marque, texte }) => ({ gras: marque, texte }));
}
