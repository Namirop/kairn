import type { DepotEvalue } from "./execution";

/**
 * Le contrôle de `deriveDe`, où le modèle déclare de quel voisin chaque concept
 * découle. Mesuré, jamais appliqué (voir `lib/domain/concepts-derives.ts`).
 *
 * Lu des deux côtés, parce que ce champ rate dans les deux sens et en silence :
 * `null` partout, ou tout rattaché à tout (six concepts sur sept au premier sur
 * `09-fait-pratique`). Aucun extrême n'est fautif en soi : le contrôle dit où
 * regarder, il ne tranche pas.
 */

/** En dessous, n'avoir aucun concept dérivé n'a rien d'étonnant. */
export const CONCEPTS_AVANT_SOUPCON = 3;

/** Au-delà, le modèle rattache plus qu'il ne distingue. */
export const PART_DERIVEE_SUSPECTE = 0.5;

export function manquementsDeGranularite(evaluation: DepotEvalue): string[] {
  // Un rejeu ne rappelle pas l'extraction : rien à contrôler.
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
