import type { DepotEvalue } from "./execution";

/**
 * Le contrôle du champ qui décide de la granularité.
 *
 * `deriveDe` remplace une consigne en prose qui n'avait rien tenu : le modèle
 * ne compte plus ses concepts, il déclare, concept par concept, celui dont
 * chacun découle, et c'est le serveur qui coupe. Le risque de ce genre de champ
 * est connu et silencieux : le modèle met `null` partout, tout passe, et le
 * rapport annonce zéro manquement pendant que rien n'a changé.
 *
 * On l'apprend donc au premier passage plutôt que six plus tard. Un dépôt
 * dense dont **aucun** concept ne découle d'un voisin est suspect — pas fautif :
 * un texte peut légitimement ne porter que des idées indépendantes. Le contrôle
 * dit où regarder, il ne tranche pas.
 */

/** En dessous, n'avoir aucun concept dérivé n'a rien d'étonnant. */
export const CONCEPTS_AVANT_SOUPCON = 3;

export function manquementsDeGranularite(evaluation: DepotEvalue): string[] {
  // Un rejeu repart d'un figé et ne rappelle pas l'extraction : il n'a pas de
  // coupe à contrôler, et se taire vaut mieux que de crier sur une absence.
  if (evaluation.derives === undefined || evaluation.echec) return [];

  const gardes = evaluation.concepts.length;

  if (evaluation.derives > 0 || gardes <= CONCEPTS_AVANT_SOUPCON) return [];

  return [
    `aucun des ${gardes} concepts ne découle d'un voisin — \`deriveDe\` est peut-être resté nul partout`,
  ];
}
