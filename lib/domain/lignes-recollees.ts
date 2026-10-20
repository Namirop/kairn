/**
 * Recolle les retours à la ligne subis (texte enroulé par un éditeur) et garde
 * les voulus (listes, puces). Ce qui les sépare : une ligne coupée par la
 * machine est pleine, elle touche le bord du paragraphe.
 */

/** Une machine enroule vers soixante-dix signes ; une liste courte est régulière aussi. */
const SEUIL_ENROULEMENT = 55;

/**
 * Le cas mesuré va de 59 à 67 signes (88 %) : la marge encaisse un mot long
 * renvoyé à la ligne, 0,9 coupait le paragraphe.
 */
const PART_PLEINE = 0.8;

/**
 * Jamais recollée à la précédente. `//` protège un extrait de code sans
 * barrières ; `|` ouvre une rangée de tableau, pleine par nature, sans espace
 * exigé (`|fichier|rôle|`).
 */
const OUVRE_UNE_ENTREE = /^\s*(?:\||#{1,6}\s|(?:\/\/|[-*•–—>]|\d{1,3}[.)])\s)/;

function normaliser(texte: string): string {
  return texte.replace(/\r\n?/g, "\n");
}

function recollerUnParagraphe(lignes: string[]): string {
  const plein = Math.max(...lignes.map((ligne) => ligne.trimEnd().length));

  if (plein < SEUIL_ENROULEMENT) return lignes.join("\n");

  const bord = plein * PART_PLEINE;
  let rendu = lignes[0] ?? "";

  for (let rang = 1; rang < lignes.length; rang += 1) {
    const precedente = lignes[rang - 1] ?? "";
    const courante = lignes[rang] ?? "";
    const recollable = precedente.trimEnd().length >= bord && !OUVRE_UNE_ENTREE.test(courante);

    rendu += recollable ? ` ${courante.trim()}` : `\n${courante}`;
  }

  return rendu;
}

export function lignesRecollees(texte: string): string {
  const lignes = normaliser(texte).split("\n");
  const rendu: string[] = [];
  let paragraphe: string[] = [];

  const vider = (): void => {
    if (paragraphe.length > 0) {
      rendu.push(recollerUnParagraphe(paragraphe));
      paragraphe = [];
    }
  };

  for (const ligne of lignes) {
    if (ligne.trim().length === 0) {
      vider();
      rendu.push("");
    } else {
      paragraphe.push(ligne);
    }
  }

  vider();

  return rendu.join("\n");
}
