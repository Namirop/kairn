/**
 * Un texte dont les retours à la ligne subis sont recollés.
 *
 * Un texte enroulé à soixante-cinq signes par son éditeur s'afficherait sur une
 * demi-carte. Mais un dépôt porte aussi des retours voulus (listes, puces), à
 * garder. Ce qui les sépare : une ligne coupée par la machine est pleine. On
 * recolle donc une ligne à la suivante seulement quand elle touche le bord du
 * paragraphe.
 */

/**
 * En deçà, aucun paragraphe n'est recollé. Une liste d'entrées courtes a aussi
 * des lignes régulières ; une machine enroule autour de soixante-dix signes,
 * jamais autour de quarante.
 */
const SEUIL_ENROULEMENT = 55;

/**
 * Part de la ligne la plus longue au-delà de laquelle une ligne est « pleine ».
 *
 * Le cas mesuré va de 59 à 67 signes (88 %) ; 0,9 coupait le paragraphe en
 * morceaux. La marge doit encaisser un mot long renvoyé à la ligne suivante.
 */
const PART_PLEINE = 0.8;

/**
 * Ce qui ouvre une ligne qu'on ne recolle jamais à la précédente : puce, numéro,
 * tiret, citation, titre (`#` à `######`).
 *
 * `//` protège un extrait de code arrivé sans barrières : un commentaire plein
 * se recollerait à la ligne de code suivante. `|` ouvre une rangée de tableau
 * markdown, pleine par nature ; elle ne demande pas d'espace derrière, une
 * rangée pouvant s'écrire `|fichier|rôle|`.
 */
const OUVRE_UNE_ENTREE = /^\s*(?:\||#{1,6}\s|(?:\/\/|[-*•–—>]|\d{1,3}[.)])\s)/;

function normaliser(texte: string): string {
  return texte.replace(/\r\n?/g, "\n");
}

/** Recolle un paragraphe, c'est-à-dire une suite de lignes non vides. */
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

/**
 * Le texte, ses coupures subies recollées et ses coupures voulues gardées. Les
 * lignes vides, qui séparent les paragraphes, sont conservées.
 */
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
