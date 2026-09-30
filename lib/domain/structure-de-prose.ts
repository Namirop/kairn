/**
 * Ce qu'un texte déposé porte comme structure, au-delà de ses paragraphes.
 *
 * **Le dépôt le plus courant du produit est du markdown, et on le lisait en
 * brut.** Une réponse d'assistant, une page de documentation, un cours copié :
 * tout ça arrive avec des dièses en tête de ligne, des astérisques autour des
 * mots importants et des tableaux à barres verticales. L'écran « Ce que tu as
 * déposé » les affichait tels quels — `## 2.1 Gradle`, `**En bref**`,
 * `|---|---|---|` —, c'est-à-dire la notation à la place de ce qu'elle note.
 *
 * Ce module lit la structure, il ne réécrit rien : l'Input reste au caractère
 * près ce qui a été posé, et c'est le rendu seul qui change. La grammaire
 * couverte est délibérément courte — titres, listes, tableaux — parce que c'est
 * ce qu'un dépôt porte réellement. Le gras se lit ailleurs (`texte-en-gras.ts`),
 * en ligne, et les extraits entre barrières ont déjà leur module
 * (`blocs-de-texte.ts`) : celui-ci ne voit que de la prose.
 *
 * Fonction pure : elle dit ce que le texte contient, jamais comment le peindre.
 */

export type ElementDeProse =
  | { type: "titre"; niveau: 1 | 2 | 3; texte: string }
  | { type: "paragraphe"; texte: string }
  | { type: "liste"; ordonnee: false; entrees: string[] }
  /** `depart` est le premier numéro écrit : une liste qui reprend à 4 reprend à 4. */
  | { type: "liste"; ordonnee: true; depart: number; entrees: string[] }
  | { type: "tableau"; entetes: string[]; lignes: string[][] };

/** Un à six dièses puis une espace. Au-delà de trois, on retombe sur trois. */
const TITRE = /^ {0,3}(#{1,6})\s+(.*)$/;

/** Une puce, quelle que soit la marque qu'on a sous la main. */
const PUCE = /^ {0,3}[-*•–]\s+(.*)$/;

/** Un numéro, suivi d'un point ou d'une parenthèse. */
const NUMERO = /^ {0,3}(\d{1,3})[.)]\s+(.*)$/;

/** Une ligne de tableau : elle commence par une barre. */
const RANGEE = /^ {0,3}\|/;

/** La ligne qui sépare l'en-tête du corps, et qui ne porte rien à lire. */
const SEPARATRICE = /^ {0,3}\|[\s|:-]*\|?\s*$/;

/** Les cellules d'une rangée, barres de bord retirées. */
function cellules(ligne: string): string[] {
  return ligne
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cellule) => cellule.trim());
}

/**
 * Un tableau, à partir des rangées qui se suivent.
 *
 * L'en-tête n'existe que si une ligne séparatrice le suit : sans elle, ce n'est
 * pas un titre de colonne, c'est une première ligne comme les autres. Les
 * rangées sont ramenées à la largeur de la plus large pour que le rendu ne
 * laisse pas de trou à droite.
 */
function tableauDe(rangees: string[]): ElementDeProse | null {
  const grille = rangees.filter((ligne) => !SEPARATRICE.test(ligne)).map(cellules);
  const entetes = SEPARATRICE.test(rangees[1] ?? "") ? (grille[0] ?? []) : [];
  const corps = entetes.length > 0 ? grille.slice(1) : grille;
  const largeur = Math.max(entetes.length, ...corps.map((ligne) => ligne.length), 0);

  // Des barres sans une seule cellule ne font pas un tableau : elles repartent
  // en paragraphe, où elles s'affichent telles qu'elles ont été déposées.
  if (largeur === 0 || corps.length === 0) return null;

  const completer = (ligne: string[]) =>
    Array.from({ length: largeur }, (_, rang) => ligne[rang] ?? "");

  return {
    type: "tableau",
    entetes: entetes.length > 0 ? completer(entetes) : [],
    lignes: corps.map(completer),
  };
}

/** Ce qu'une ligne ouvre, ou `null` si elle continue ce qui précède. */
function natureDe(ligne: string): "titre" | "puce" | "numero" | "rangee" | null {
  if (TITRE.test(ligne)) return "titre";
  if (RANGEE.test(ligne)) return "rangee";
  if (PUCE.test(ligne)) return "puce";
  if (NUMERO.test(ligne)) return "numero";

  return null;
}

/** Trois niveaux suffisent à un dépôt ; au-delà, on ne sait plus les distinguer. */
const NIVEAUX = [1, 2, 3] as const;

function titreDe(ligne: string): ElementDeProse {
  const lu = TITRE.exec(ligne);
  const niveau = NIVEAUX[Math.min((lu?.[1] ?? "#").length, NIVEAUX.length) - 1] ?? 3;

  return { type: "titre", niveau, texte: lu?.[2]?.trim() ?? "" };
}

function listeAPuces(lignes: string[]): ElementDeProse {
  return {
    type: "liste",
    ordonnee: false,
    entrees: lignes.map((ligne) => PUCE.exec(ligne)?.[1]?.trim() ?? ligne.trim()),
  };
}

/**
 * Une liste numérotée, et le numéro par lequel elle commence.
 *
 * On ne renumérote pas à partir de un : un dépôt coupé au milieu d'une
 * énumération reprend à quatre, et afficher « 1 » à la place réécrirait ce
 * qu'on a posé. Seuls les numéros suivants sont rendus au rendu, qui sait
 * compter.
 */
function listeNumerotee(lignes: string[]): ElementDeProse {
  const premier = Number(NUMERO.exec(lignes[0] ?? "")?.[1] ?? "1");

  return {
    type: "liste",
    ordonnee: true,
    depart: Number.isFinite(premier) ? premier : 1,
    entrees: lignes.map((ligne) => NUMERO.exec(ligne)?.[2]?.trim() ?? ligne.trim()),
  };
}

/** Le bloc que forment des lignes de même nature, une fois qu'elles s'arrêtent. */
function blocDe(lignes: string[], nature: ReturnType<typeof natureDe>): ElementDeProse[] {
  if (lignes.length === 0) return [];

  if (nature === "rangee") {
    const tableau = tableauDe(lignes);

    if (tableau) return [tableau];
  }

  if (nature === "puce") return [listeAPuces(lignes)];
  if (nature === "numero") return [listeNumerotee(lignes)];
  if (nature === "titre") return lignes.map(titreDe);

  const texte = lignes.join("\n").trim();

  return texte.length > 0 ? [{ type: "paragraphe", texte }] : [];
}

/**
 * Les éléments d'un texte de prose, dans l'ordre où ils s'y trouvent.
 *
 * Une ligne vide ferme ce qui est ouvert, comme partout en markdown. Un
 * changement de nature aussi : une puce sous un paragraphe ouvre une liste sans
 * qu'il faille sauter une ligne, parce que c'est ce que tout le monde écrit.
 */
export function elementsDeProse(texte: string): ElementDeProse[] {
  const elements: ElementDeProse[] = [];
  let courant: string[] = [];
  let nature: ReturnType<typeof natureDe> = null;

  const vider = (): void => {
    elements.push(...blocDe(courant, nature));
    courant = [];
  };

  for (const ligne of texte.replace(/\r\n?/g, "\n").split("\n")) {
    if (ligne.trim().length === 0) {
      vider();
      nature = null;
      continue;
    }

    const ouverte = natureDe(ligne);

    if (ouverte !== nature) {
      vider();
      nature = ouverte;
    }

    courant.push(ligne);
  }

  vider();

  return elements;
}
