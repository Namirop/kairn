/**
 * Combien de pierres une pile compte, et jusqu'où elle est comblée. Au-delà du
 * plafond, une pierre vaut une part du chemin, comblée en continu pour que
 * chaque réponse fasse bouger quelque chose ; en deçà, une question.
 */

/** Sept pierres se voient sans se compter et tiennent dans une colonne. */
export const PIERRES_MAX = 7;

export type RemplissageDePile = {
  /** Combien de pierres la pile dessine. */
  pierres: number;
  /** Combien sont posées, entièrement. */
  posees: number;
  /** De 0 à 1 exclu : la part comblée de la pierre en cours. */
  part: number;
};

export function remplissageDePile(
  rang: number,
  total: number,
  max: number = PIERRES_MAX,
): RemplissageDePile {
  const questions = Math.max(Math.floor(total), 1);
  const pierres = Math.max(Math.min(questions, Math.floor(max)), 1);
  const faites = Math.min(Math.max(Math.floor(rang), 0), questions);

  // Multiplier d'abord : `2 / 3 * 3` vaut 1,999...998 et poserait une pierre de moins.
  const avance = (faites * pierres) / questions;
  const posees = Math.min(Math.floor(avance), pierres);

  return { pierres, posees, part: avance - posees };
}
