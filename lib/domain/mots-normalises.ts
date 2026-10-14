import { aplati } from "./texte-aplati";

/**
 * Un texte ramené à ses mots : sans accents, sans casse, sans ponctuation, les
 * mots séparés d'une seule espace.
 */
export function motsAplatis(texte: string): string {
  return aplati(texte)
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Les mêmes mots, bordés d'espaces pour qu'une inclusion ne tombe que sur des
 * mots entiers.
 */
export function motsNormalises(texte: string): string {
  return ` ${motsAplatis(texte)} `;
}
