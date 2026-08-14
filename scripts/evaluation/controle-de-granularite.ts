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
 * On l'apprend donc au premier passage plutôt que six plus tard, et **des deux
 * côtés**, parce que le champ peut rater dans les deux sens.
 *
 * En dessous, le modèle n'a rien déclaré et rien n'a changé. Au-dessus, il
 * rattache tout à tout et la coupe emporte le dépôt : `ecarterLesDerives` ne
 * refuse que de rendre une liste **vide**, ce qui laisse passer un dépôt de dix
 * concepts réduit à un seul, ou deux concepts qui se désignent mutuellement
 * pendant qu'un troisième survit. Aucun des deux n'est fautif en soi — un texte
 * peut n'être fait que d'idées indépendantes, un autre que d'illustrations d'une
 * même règle. Le contrôle dit où regarder, il ne tranche pas.
 */

/** En dessous, n'avoir aucun concept dérivé n'a rien d'étonnant. */
export const CONCEPTS_AVANT_SOUPCON = 3;

/** Au-delà, la relation coupe plus qu'elle ne garde. */
export const PART_ECARTEE_SUSPECTE = 0.5;

export function manquementsDeGranularite(evaluation: DepotEvalue): string[] {
  // Un rejeu repart d'un figé et ne rappelle pas l'extraction : il n'a pas de
  // coupe à contrôler, et se taire vaut mieux que de crier sur une absence.
  if (evaluation.derives === undefined || evaluation.echec) return [];

  const gardes = evaluation.concepts.length;
  const ecartes = evaluation.derives;
  // Ce que le modèle avait rendu, à la troncature près — laquelle ne survient
  // qu'au-delà de vingt gardés, où la part écartée n'est plus le sujet.
  const rendus = gardes + ecartes;

  if (rendus === 0) return [];

  if (ecartes === 0) {
    return gardes > CONCEPTS_AVANT_SOUPCON
      ? [
          `aucun des ${gardes} concepts ne découle d'un voisin — \`deriveDe\` est peut-être resté nul partout`,
        ]
      : [];
  }

  if (ecartes <= rendus * PART_ECARTEE_SUSPECTE) return [];

  return [
    `${ecartes} des ${rendus} concepts rendus ont été écartés comme dérivés — la coupe emporte plus qu'elle ne garde`,
  ];
}
