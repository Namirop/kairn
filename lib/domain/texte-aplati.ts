/** La seule normalisation que partagent tous les comparateurs de texte ; chacun ajoute la sienne. */

/** Les diacritiques combinants, tels que `normalize("NFD")` les détache. */
const DIACRITIQUES = /[̀-ͯ]/g;

/** La casse et la ponctuation restent. */
export function sansAccents(texte: string): string {
  return texte.normalize("NFD").replace(DIACRITIQUES, "");
}

export function aplati(texte: string): string {
  return sansAccents(texte).toLowerCase();
}
