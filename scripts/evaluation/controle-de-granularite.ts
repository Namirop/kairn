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
 * On le lit donc à chaque passage, et **des deux côtés**, parce que le champ
 * rate dans les deux sens. En dessous, le modèle n'a rien déclaré et le champ ne
 * sert à rien. Au-dessus, il rattache tout à tout — sur `09-fait-pratique`, six
 * concepts sur sept renvoyaient au premier.
 *
 * **Ce contrôle ne mesure plus une coupe, il mesure une déclaration.** Rien
 * n'est écarté depuis que le passage du 19h38 a montré ce que la coupe coûtait ;
 * ce nombre dit seulement à quel point le modèle voit des relations partout, et
 * c'est la donnée qu'il faudra si on reprend le sujet.
 *
 * Aucun des deux extrêmes n'est fautif en soi : un texte peut n'être fait que
 * d'idées indépendantes, un autre que d'illustrations d'une même règle. Le
 * contrôle dit où regarder, il ne tranche pas.
 */

/** En dessous, n'avoir aucun concept dérivé n'a rien d'étonnant. */
export const CONCEPTS_AVANT_SOUPCON = 3;

/** Au-delà, le modèle rattache plus qu'il ne distingue. */
export const PART_DERIVEE_SUSPECTE = 0.5;

export function manquementsDeGranularite(evaluation: DepotEvalue): string[] {
  // Un rejeu repart d'un figé et ne rappelle pas l'extraction : il n'a rien à
  // contrôler, et se taire vaut mieux que de crier sur une absence.
  if (evaluation.derives === undefined || evaluation.echec) return [];

  const concepts = evaluation.concepts.length;
  const derives = evaluation.derives;

  if (concepts === 0) return [];

  if (derives === 0) {
    return concepts > CONCEPTS_AVANT_SOUPCON
      ? [
          `aucun des ${concepts} concepts ne se déclare dérivé d'un voisin — \`deriveDe\` est peut-être resté nul partout`,
        ]
      : [];
  }

  if (derives <= concepts * PART_DERIVEE_SUSPECTE) return [];

  return [
    `${derives} des ${concepts} concepts se déclarent dérivés d'un voisin — le modèle rattache plus qu'il ne distingue`,
  ];
}
