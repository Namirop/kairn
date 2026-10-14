/**
 * La taille qu'une capture doit prendre avant d'être envoyée. Le calcul est pur
 * pour que le navigateur et le serveur réduisent de la même façon.
 *
 * Elle n'agrandit jamais une image : agrandir n'ajoute que des octets.
 */

export type Dimensions = { largeur: number; hauteur: number };

/**
 * Les dimensions après réduction au bord long donné, rapport conservé.
 *
 * Arrondi au pixel supérieur : un canevas de zéro pixel ne se dessine pas. Une
 * mesure absente ou absurde rend la mesure d'origine, pour ne pas bloquer un
 * dépôt sur un décodeur qui n'a pas su dire la taille.
 */
export function dimensionsReduites(source: Dimensions, bordLong: number): Dimensions {
  const { largeur, hauteur } = source;

  if (!Number.isFinite(largeur) || !Number.isFinite(hauteur)) return source;
  if (largeur <= 0 || hauteur <= 0 || bordLong <= 0) return source;

  const long = Math.max(largeur, hauteur);

  if (long <= bordLong) return source;

  const facteur = bordLong / long;

  /*
    Borné par `bordLong` : `long * (bordLong / long)` peut rendre
    1 568,000000000000 2 (sur 19 323 pixels), que l'arrondi supérieur pose à
    1 569.
  */
  const reduire = (cote: number): number =>
    Math.min(bordLong, Math.max(1, Math.ceil(cote * facteur)));

  return { largeur: reduire(largeur), hauteur: reduire(hauteur) };
}
