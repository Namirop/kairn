/** La mise au propre commune à `texte-code.ts` et `texte-en-gras.ts`. */

export type MorceauMarque = {
  /** Vrai pour une partie relevée par la marque, faux pour le reste. */
  marque: boolean;
  texte: string;
};

/** Deux parties marquées voisines restent séparées : ce sont deux termes distincts. */
export function fusionnerLaProse(morceaux: readonly MorceauMarque[]): MorceauMarque[] {
  const fusionnes: MorceauMarque[] = [];

  for (const { marque, texte } of morceaux) {
    if (texte.length === 0) continue;

    const dernier = fusionnes[fusionnes.length - 1];

    if (!marque && dernier && !dernier.marque) dernier.texte += texte;
    else fusionnes.push({ marque, texte });
  }

  return fusionnes;
}
