/**
 * Un vrai ou faux sans `estVraie` retombe en question ouverte : une affirmation
 * fausse s'y lirait comme le concept à retenir. Le schéma n'oblige pas le modèle
 * à le rendre, donc ce filtre l'arrête avant la base ; la facette revient à la
 * réécriture suivante.
 */

/** Un lot débarrassé des affirmations qui ne disent pas leur verdict. */
export function sansAffirmationMuette<T extends { format: string; estVraie?: boolean | null }>(
  lot: readonly T[],
): T[] {
  return lot.filter(
    (question) => question.format !== "TRUE_FALSE" || typeof question.estVraie === "boolean",
  );
}
