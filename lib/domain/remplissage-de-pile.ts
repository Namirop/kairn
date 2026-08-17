/**
 * Combien de pierres une pile compte, et jusqu'où elle est comblée.
 *
 * Une pierre par question tenait à six questions et s'effondrait à vingt : une
 * tour de vingt traits de quatre pixels. La pile a donc un plafond, et au-delà
 * une pierre ne vaut plus une question mais une part du chemin.
 *
 * Le plafond seul ne suffisait pas. Avec vingt questions pour sept pierres, une
 * pierre se posait toutes les trois réponses : deux réponses sur trois ne
 * déplaçaient rien, et un compteur qui ne bouge pas quand on avance ne se
 * regarde plus. La part comblée est donc continue — la pierre en cours se
 * remplit par le bas, et chaque réponse la fait monter.
 *
 * Sous le plafond, la part vaut exactement une question et la pierre en cours
 * est toujours vide ou pleine : les deux régimes n'en font qu'un, sans cas
 * particulier à écrire ni à tester à part.
 */

/**
 * Au-delà, la pile cesse de se lire comme un empilement.
 *
 * Sept est le compte où l'on voit encore chaque pierre sans les compter, et
 * c'est aussi la hauteur qui tient dans une colonne sans dominer l'écran.
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

  // La multiplication d'abord, la division ensuite : `2 / 3 * 3` vaut
  // 1,999...998 en flottant, ce qui posait une pierre de moins et la suivante
  // remplie à 99,98 %. `(2 * 3) / 3` vaut deux.
  const avance = (faites * pierres) / questions;
  const posees = Math.min(Math.floor(avance), pierres);

  return { pierres, posees, part: avance - posees };
}
