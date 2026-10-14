import { blocsDeTexte } from "./blocs-de-texte";
import { type ElementDeProse, elementsDeProse } from "./structure-de-prose";
import { segmentsEnGras } from "./texte-en-gras";

/**
 * Les premiers mots d'un dépôt, ses marques de markdown retirées, pour l'aperçu
 * de deux lignes de la liste des dépôts.
 *
 * Deux lignes ne peuvent pas rendre une structure : on la met à plat, les
 * morceaux séparés par le point médian du produit.
 *
 * Les accents graves survivent exprès : c'est le rendu qui relève les termes de
 * code.
 */

/** Ce qui sépare deux morceaux mis à plat. Le point médian de la liste. */
const SEPARATEUR = " · ";

/**
 * Ce qu'on lit avant de couper : mettre à plat coûte au prorata du texte, pour
 * deux lignes affichées. De quoi remplir l'aperçu même si les marques en mangent
 * la moitié.
 */
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
