/**
 * Combien de concepts jamais vus la session du jour accepte.
 *
 * Un concept neuf a une urgence infinie : sans cette borne, un gros dépôt
 * remplirait la session de neuf pendant des jours. Le neuf garde sa part quand
 * la révision se bouscule, prend les places libres sinon, et n'entre plus quand
 * l'arriéré décroche. Le total servi ne change pas, seule la composition.
 */

/** Une proportion, parce que le plafond de session se règle de 5 à 50. */
export const PART_NEUVE = 0.4;

/**
 * L'arriéré, en journées de session, qui ferme l'entrée. Un concept neuf coûte
 * environ quatre passages le premier mois : sans fermeture, un débit soutenu
 * crée un arriéré qui ne se résorbe jamais. Deux et pas une, pour qu'une
 * mauvaise journée ne suffise pas.
 */
export const ARRIERE_QUI_FERME = 2;

/**
 * Le maximum de la part garantie et des places que la révision laisse. Au moins
 * une place, sinon un arrondi à zéro arrêterait l'introduction pour toujours.
 */
export function placesPourLeNeuf(plafond: number, revusDisponibles: number): number {
  const borne = Math.max(0, plafond);

  if (borne === 0) return 0;

  const arriere = Math.max(0, revusDisponibles);
  const garantie =
    arriere > ARRIERE_QUI_FERME * borne ? 0 : Math.max(1, Math.round(borne * PART_NEUVE));

  return Math.max(garantie, borne - arriere);
}

/** L'ordre d'urgence des candidats est conservé : on choisit qui passe, pas quand. */
export function bornerLeNeuf<T extends { lastReview: Date | null }>(
  candidats: readonly T[],
  plafond: number,
): T[] {
  const borne = Math.max(0, plafond);

  if (candidats.length <= borne) return [...candidats];

  const neufs = candidats.filter((candidat) => candidat.lastReview === null);
  const revus = candidats.filter((candidat) => candidat.lastReview !== null);

  const retenus = new Set<T>(neufs.slice(0, placesPourLeNeuf(borne, revus.length)));

  for (const revu of revus) {
    if (retenus.size >= borne) break;

    retenus.add(revu);
  }

  return candidats.filter((candidat) => retenus.has(candidat));
}
