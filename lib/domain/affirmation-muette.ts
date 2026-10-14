/**
 * Une affirmation dont on ne sait pas si elle est vraie.
 *
 * Un vrai ou faux tient son verdict de `estVraie`. Sans lui, la question
 * retombe en question ouverte, et une affirmation fausse par construction se
 * lit comme le concept à retenir : le produit fixerait une contre-vérité.
 *
 * Le schéma n'oblige pas le modèle à rendre `estVraie` (l'écriture, elle, est
 * traitée dans `payloadDe`, `lib/db/variants.ts`) : ce filtre empêche une telle
 * question d'atteindre la base. La facette manquante revient à la réécriture
 * suivante.
 */

/** Un lot débarrassé des affirmations qui ne disent pas leur verdict. */
export function sansAffirmationMuette<T extends { format: string; estVraie?: boolean | null }>(
  lot: readonly T[],
): T[] {
  return lot.filter(
    (question) => question.format !== "TRUE_FALSE" || typeof question.estVraie === "boolean",
  );
}
