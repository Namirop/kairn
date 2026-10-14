/**
 * Ramener deux écritures d'un même mot à la même forme : sans accents, et le
 * plus souvent sans casse. Chaque appelant ajoute ensuite sa propre coupe
 * (ponctuation, espaces) : celle-ci est la seule qu'ils partagent tous.
 */

/** Les diacritiques combinants, tels que `normalize("NFD")` les détache. */
const DIACRITIQUES = /[̀-ͯ]/g;

/** Le texte, accents ôtés ; la casse et la ponctuation restent. */
export function sansAccents(texte: string): string {
  return texte.normalize("NFD").replace(DIACRITIQUES, "");
}

/** Le texte sans accents et en minuscules. */
export function aplati(texte: string): string {
  return sansAccents(texte).toLowerCase();
}
