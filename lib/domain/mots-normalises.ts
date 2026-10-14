/**
 * Un texte ramené à ses mots : sans accents, sans casse, sans ponctuation, et
 * bordé d'espaces pour qu'une inclusion ne tombe que sur des mots entiers.
 */
export function motsNormalises(texte: string): string {
  return ` ${texte
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()} `;
}
