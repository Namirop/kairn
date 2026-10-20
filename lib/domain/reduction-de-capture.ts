/**
 * La taille d'une capture avant envoi, partagée par le navigateur et le serveur.
 * Jamais agrandie : agrandir n'ajoute que des octets.
 */

export type Dimensions = { largeur: number; hauteur: number };

/**
 * Arrondi au pixel supérieur : un canevas de zéro pixel ne se dessine pas. Une
 * mesure absurde rend l'origine, pour ne pas bloquer un dépôt sur un décodeur.
 */
export function dimensionsReduites(source: Dimensions, bordLong: number): Dimensions {
  const { largeur, hauteur } = source;

  if (!Number.isFinite(largeur) || !Number.isFinite(hauteur)) return source;
  if (largeur <= 0 || hauteur <= 0 || bordLong <= 0) return source;

  const long = Math.max(largeur, hauteur);

  if (long <= bordLong) return source;

  const facteur = bordLong / long;

  // `long * (bordLong / long)` peut rendre 1568,0000000000002, arrondi à 1569.
  const reduire = (cote: number): number =>
    Math.min(bordLong, Math.max(1, Math.ceil(cote * facteur)));

  return { largeur: reduire(largeur), hauteur: reduire(hauteur) };
}
