/**
 * Un texte dont les retours à la ligne subis sont recollés.
 *
 * **Le défaut se voit à l'écran avant de se comprendre.** Un dépôt collé depuis
 * un éditeur qui coupe ses lignes à soixante-cinq signes s'affichait sur une
 * colonne de soixante-cinq signes, au milieu d'une carte deux fois plus large :
 * le texte occupait la moitié gauche et laissait l'autre vide. C'est le cas
 * mesuré sur la production — neuf lignes de 59 à 67 signes pour un paragraphe
 * qui n'en formait qu'un.
 *
 * On ne peut pas simplement tout recoller : un dépôt porte aussi des retours
 * **voulus** — une liste d'expressions, une ligne par entrée, des puces. Les
 * effacer collerait six expressions anglaises en une phrase illisible.
 *
 * La distinction se fait sur la seule chose qui les sépare vraiment : **une
 * ligne coupée par la machine est pleine.** Un texte enroulé à une colonne a
 * toutes ses lignes au bord de cette colonne, à un mot près ; une liste a des
 * lignes de longueurs quelconques, souvent courtes. On recolle donc une ligne à
 * la suivante quand la première touche le bord du paragraphe, et jamais sinon.
 *
 * Fonction pure : elle ne rend qu'un texte, et ne décide de rien du rendu.
 */

/**
 * En deçà, aucun paragraphe n'est recollé.
 *
 * Une liste d'entrées courtes — « to look forward to — attendre avec
 * impatience », quarante-quatre signes — a elle aussi des lignes de longueurs
 * voisines : prise seule, la règle du bord la recollerait. Une machine qui
 * enroule du texte le fait autour de soixante-dix signes, jamais autour de
 * quarante ; en dessous de ce seuil, des lignes régulières sont un choix
 * d'écriture, pas une contrainte de colonne.
 */
const SEUIL_ENROULEMENT = 55;

/**
 * Part de la ligne la plus longue au-delà de laquelle une ligne est « pleine ».
 *
 * Quatre cinquièmes, mesuré sur le dépôt qui a fait ouvrir ce module : ses
 * lignes vont de 59 à 67 signes, soit 88 % de la plus longue au minimum. Neuf
 * dixièmes coupaient le recollage en plein milieu du paragraphe — la ligne à 59
 * tombait juste sous la barre, et le texte se recollait par morceaux. La marge
 * doit encaisser un mot long en fin de ligne, qui est précisément ce qui fait
 * qu'une ligne enroulée s'arrête plus tôt que les autres.
 */
const PART_PLEINE = 0.8;

/**
 * Ce qui ouvre une ligne qu'on ne recolle jamais à la précédente.
 *
 * Une puce, un numéro, un tiret, une citation, un titre : autant de marques qui
 * disent « nouvelle entrée ». Sans elles, deux puces qui se suivent dans un
 * paragraphe dense se retrouveraient dans la même phrase — le cas s'est présenté
 * sur le premier dépôt de code lu par la reconnaissance de texte.
 */
const OUVRE_UNE_ENTREE = /^\s*(?:[-*•–—>#]|\d{1,3}[.)])\s/;

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
 * Le texte, ses coupures subies recollées et ses coupures voulues gardées.
 *
 * Les lignes vides sont conservées telles quelles : ce sont elles qui séparent
 * les paragraphes, et c'est sur elles qu'on découpe pour raisonner.
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
