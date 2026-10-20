/**
 * La structure markdown d'un dépôt, pour que l'écran rende la notation au lieu
 * de l'afficher. Grammaire volontairement courte (titres, listes, tableaux) ; le
 * gras et les extraits de code sont traités ailleurs.
 */

export type ElementDeProse =
  | { type: "titre"; niveau: 1 | 2 | 3; texte: string }
  | { type: "paragraphe"; texte: string }
  | { type: "liste"; ordonnee: false; entrees: string[] }
  /** `depart` est le premier numéro écrit : une liste qui reprend à 4 reprend à 4. */
  | { type: "liste"; ordonnee: true; depart: number; entrees: string[] }
  | { type: "tableau"; entetes: string[]; lignes: string[][] };

/** Au-delà de trois dièses, on retombe sur trois. */
const TITRE = /^ {0,3}(#{1,6})\s+(.*)$/;

const PUCE = /^ {0,3}[-*•–]\s+(.*)$/;

const NUMERO = /^ {0,3}(\d{1,3})[.)]\s+(.*)$/;

const RANGEE = /^ {0,3}\|/;

/** La ligne qui sépare l'en-tête du corps. */
const SEPARATRICE = /^ {0,3}\|[\s|:-]*\|?\s*$/;

function cellules(ligne: string): string[] {
  return ligne
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cellule) => cellule.trim());
}

/**
 * L'en-tête n'existe que si une ligne séparatrice le suit. Les rangées prennent
 * la largeur de la plus large, sans trou à droite au rendu.
 */
function tableauDe(rangees: string[]): ElementDeProse | null {
  const grille = rangees.filter((ligne) => !SEPARATRICE.test(ligne)).map(cellules);
  const entetes = SEPARATRICE.test(rangees[1] ?? "") ? (grille[0] ?? []) : [];
  const corps = entetes.length > 0 ? grille.slice(1) : grille;
  const largeur = Math.max(entetes.length, ...corps.map((ligne) => ligne.length), 0);

  // Des barres sans cellule repartent en paragraphe, affichées telles quelles.
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

/** Au-delà de trois niveaux, on ne sait plus les distinguer. */
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

function listeNumerotee(lignes: string[]): ElementDeProse {
  const premier = Number(NUMERO.exec(lignes[0] ?? "")?.[1] ?? "1");

  return {
    type: "liste",
    ordonnee: true,
    depart: Number.isFinite(premier) ? premier : 1,
    entrees: lignes.map((ligne) => NUMERO.exec(ligne)?.[2]?.trim() ?? ligne.trim()),
  };
}

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

/** Un changement de nature ferme le bloc : une puce sous un paragraphe ouvre une liste sans ligne vide. */
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
