/**
 * Combien de pierres une pile compte, et jusqu'où elle est comblée.
 *
 * La pile est plafonnée ; au-delà, une pierre vaut une part du chemin et non une
 * question. La part comblée est continue pour que chaque réponse fasse bouger
 * quelque chose. Sous le plafond, une part vaut une question et la pierre en
 * cours est vide ou pleine : un seul calcul pour les deux régimes.
 */

/**
 * Au-delà, la pile cesse de se lire comme un empilement : sept pierres se
 * voient sans se compter et tiennent dans une colonne sans dominer l'écran.
 */
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

  // La multiplication avant la division : `2 / 3 * 3` vaut 1,999...998 en
  // flottant et poserait une pierre de moins.
  const avance = (faites * pierres) / questions;
  const posees = Math.min(Math.floor(avance), pierres);

  return { pierres, posees, part: avance - posees };
}
