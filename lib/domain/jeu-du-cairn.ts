/**
 * Les règles du cairn à empiler, pendant que le dépôt travaille.
 *
 * Ce sont les seules décisions du jeu, et elles sont ici parce qu'elles se
 * vérifient : une pierre qui traverse son cadre ou une tolérance qui varie d'un
 * rang à l'autre ne se voient pas à l'œil sur une animation, mais se démontrent
 * en une propriété.
 *
 * **Le jeu occupe l'attente entière, pas une de ses phases.** Le découpage rend
 * en 6 secondes de médiane, l'écriture des questions en 20 : mesuré à un moment
 * plutôt qu'à l'autre, un occupant clignote ou se coupe au changement d'étape.
 * Celui-ci démarre au dépôt et vit jusqu'à ce que tout soit là — il ignore les
 * phases, donc elles ne peuvent pas l'interrompre.
 *
 * Il n'y a ni score, ni record, ni partie perdue. C'est une attente, pas un
 * défi : une pierre mal posée se pose quand même, de travers, et la suivante
 * arrive. Le seul retour est visuel.
 */

/**
 * Assez pour occuper l'attente sans devenir une tâche à finir.
 *
 * Le compte décide aussi de la silhouette, et c'est par là qu'il s'est arrêté
 * ici. Six pierres donnaient un empilement large et bas, qui tenait dans une
 * vignette carrée à côté d'une colonne haute : le cairn y ressemblait à un
 * bouton. Neuf donnaient une tour élancée, plus une tour qu'un cairn. Sept
 * garde l'affinement visible du bas vers le haut tout en montant assez pour
 * qu'une colonne étroite lui aille.
 */
export const PIERRES_DU_JEU = 7;

/**
 * L'écart toléré, en unités de la vue de largeur 100.
 *
 * Généreux, et c'est le point. Une pierre fait de trente à soixante unités de
 * large : quatre unités d'écart, c'est moins d'un dixième de sa largeur, mais
 * assez pour qu'on réussisse sans viser. Le jeu doit se gagner distraitement —
 * quelqu'un qui rate parce qu'il regardait ailleurs a raison de regarder
 * ailleurs, c'est son dépôt qu'il attend.
 */
export const TOLERANCE = 4;

/** Aller-retour du balancier au premier rang, puis au dernier. */
const PERIODE_PREMIERE_MS = 2400;
const PERIODE_DERNIERE_MS = 1500;

/**
 * Le balancier accélère en montant, à peine.
 *
 * Sans rien, les six pierres se posent au même rythme et le jeu n'a pas de
 * fin — juste un arrêt. Avec, la dernière demande un peu plus d'attention que
 * la première, ce qui suffit à faire une montée. On reste loin d'une difficulté :
 * la tolérance, elle, ne bouge pas.
 */
export function periodeDuRang(rang: number, total: number = PIERRES_DU_JEU): number {
  if (total <= 1) return PERIODE_PREMIERE_MS;

  const avancee = Math.min(Math.max(rang, 0), total - 1) / (total - 1);

  return PERIODE_PREMIERE_MS + (PERIODE_DERNIERE_MS - PERIODE_PREMIERE_MS) * avancee;
}

/**
 * Où se trouve la pierre qui va et vient, à l'instant `temps`.
 *
 * Une onde triangulaire et non une sinusoïde : une sinusoïde ralentit aux deux
 * bouts, si bien que la pierre s'attarde exactement là où l'on ne veut pas la
 * poser et file au milieu, qui est la seule position utile. À vitesse
 * constante, chaque position vaut son temps.
 *
 * `temps` est une durée écoulée en millisecondes, pas une horloge : la fonction
 * reste pure et se rejoue à l'identique dans un test.
 */
export function positionDuBalancier(
  temps: number,
  periode: number,
  min: number,
  max: number,
): number {
  if (periode <= 0 || max <= min) return min;

  const phase = (((temps % periode) + periode) % periode) / periode;
  // Deux moitiés : on va de `min` à `max`, puis on revient.
  const montee = phase < 0.5 ? phase * 2 : 2 - phase * 2;

  return min + (max - min) * montee;
}

export type PierrePosee = {
  /** L'abscisse où elle repose vraiment, dans la vue de largeur 100. */
  x: number;
  /** Elle est tombée dans la tolérance : elle se cale sur le pointillé. */
  dAplomb: boolean;
};

/**
 * Ce que devient une pierre lâchée à `x` alors que le pointillé l'attendait à
 * `cible`.
 *
 * Dans la tolérance, elle se **cale** sur la cible plutôt que de rester où elle
 * est : à trois unités près, une pierre qui reste de travers donne l'impression
 * d'avoir raté alors qu'on a réussi. Le pointillé promet une place, la réussite
 * la donne exactement.
 *
 * En dehors, elle reste où on l'a lâchée. Elle ne tombe pas, elle ne fait rien
 * perdre : elle est simplement de travers, et ça se voit — c'est tout le retour
 * dont ce jeu a besoin.
 */
export function poserLaPierre(
  x: number,
  cible: number,
  tolerance: number = TOLERANCE,
): PierrePosee {
  const dAplomb = Math.abs(x - cible) <= Math.max(0, tolerance);

  return { x: dAplomb ? cible : x, dAplomb };
}
