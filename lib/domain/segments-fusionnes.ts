/**
 * La mise au propre commune aux découpes d'un texte en parties marquées et
 * parties ordinaires (`texte-code.ts`, `texte-en-gras.ts`) : chaque découpe
 * repère ses marques, celle-ci range les morceaux.
 */

export type MorceauMarque = {
  /** Vrai pour une partie relevée par la marque, faux pour le reste. */
  marque: boolean;
  texte: string;
};

/**
 * Les morceaux dans l'ordre, sans les vides, et la prose voisine fusionnée en
 * un seul morceau. Deux parties marquées voisines restent séparées : ce sont
 * deux termes distincts.
 */
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
