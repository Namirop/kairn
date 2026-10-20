import { blocsDeTexte } from "./blocs-de-texte";
import { type ElementDeProse, elementsDeProse } from "./structure-de-prose";
import { segmentsEnGras } from "./texte-en-gras";

/**
 * L'aperçu de deux lignes d'un dépôt dans la liste : structure mise à plat,
 * marques retirées. Les accents graves survivent exprès, le rendu relève le code.
 */

const SEPARATEUR = " · ";

/** Assez pour remplir deux lignes même si les marques en mangent la moitié. */
const PREFIXE = 1200;

function sansGras(texte: string): string {
  return segmentsEnGras(texte)
    .map((segment) => segment.texte)
    .join("");
}

/** Un élément ramené à ses mots, dans l'ordre où on les lirait. */
function aPlat(element: ElementDeProse): string {
  if (element.type === "liste") return element.entrees.join(SEPARATEUR);

  if (element.type === "tableau") {
    return [...element.entetes, ...element.lignes.flat()].filter(Boolean).join(SEPARATEUR);
  }

  return element.texte;
}

export function apercuDeProse(texte: string, longueur: number): string {
  const morceaux = blocsDeTexte(texte.slice(0, PREFIXE)).flatMap((bloc) =>
    // Un extrait cité garde ses mots mais perd ses lignes.
    bloc.type === "code" ? [bloc.texte] : elementsDeProse(bloc.texte).map(aPlat),
  );

  return sansGras(morceaux.join(SEPARATEUR)).replace(/\s+/g, " ").trim().slice(0, longueur).trim();
}
