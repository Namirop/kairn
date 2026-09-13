/**
 * La taille qu'une capture doit prendre avant d'être envoyée.
 *
 * Une image plus large que ce que le modèle sait lire ne rend rien de plus : le
 * serveur la réduisait déjà, mais après l'avoir reçue — et c'est justement le
 * transport qui posait problème depuis un téléphone. Le calcul vit ici, pur,
 * pour que les deux côtés le fassent de la même façon et qu'on puisse
 * l'éprouver sans navigateur.
 *
 * Elle ne grandit jamais une image : agrandir n'ajoute pas d'information, ça
 * n'ajoute que des octets.
 */

export type Dimensions = { largeur: number; hauteur: number };

/**
 * Les dimensions après réduction au bord long donné, rapport conservé.
 *
 * Les deux côtés sont arrondis au pixel supérieur : un canevas de zéro pixel de
 * haut ne se dessine pas, et une image d'un pixel de large est une image, aussi
 * inutile soit-elle. Une mesure absente ou absurde rend la mesure d'origine —
 * il n'y a alors rien à décider, et refuser bloquerait un dépôt pour un
 * décodeur qui n'a pas su dire la taille.
 */
export function dimensionsReduites(source: Dimensions, bordLong: number): Dimensions {
  const { largeur, hauteur } = source;

  if (!Number.isFinite(largeur) || !Number.isFinite(hauteur)) return source;
  if (largeur <= 0 || hauteur <= 0 || bordLong <= 0) return source;

  const long = Math.max(largeur, hauteur);

  if (long <= bordLong) return source;

  const facteur = bordLong / long;

  /*
    Le bord long est **borné**, pas seulement calculé.

    `long * (bordLong / long)` ne rend pas toujours `bordLong` : sur 19 323
    pixels ramenés à 1 568, la division puis la multiplication rendent
    1 568,000000000000 2, et l'arrondi au supérieur pose 1 569. Un pixel de trop,
    donc une mesure qui dépasse la borne qu'elle est censée tenir. Le plafond le
    referme, et il ne coûte rien au cas ordinaire.
  */
  const reduire = (cote: number): number =>
    Math.min(bordLong, Math.max(1, Math.ceil(cote * facteur)));

  return { largeur: reduire(largeur), hauteur: reduire(hauteur) };
}
