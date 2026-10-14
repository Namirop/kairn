/**
 * Les règles du cairn à empiler pendant que le dépôt travaille.
 *
 * Le jeu démarre au dépôt et vit jusqu'à ce que tout soit là, sans suivre les
 * phases (découpage ~6 s, questions ~20 s) : un occupant calé sur une phase
 * clignoterait au changement d'étape. Le cairn peut tomber, sinon ce n'est
 * qu'une liste qui se remplit ; le score (`score-du-cairn.ts`) ne quitte pas la
 * page.
 */

/**
 * Sept pierres : six donnaient un empilement bas qui ressemblait à un bouton
 * dans sa vignette, neuf une tour plutôt qu'un cairn.
 */
export const PIERRES_DU_JEU = 7;

/**
 * L'écart toléré pour une pose d'aplomb, en unités de la vue de largeur 100.
 *
 * La fenêtre de temps dans la zone vaut `2 × tolérance × période ÷ course` :
 * à 2,5 elle va de 143 ms (bas) à 58 ms (haut), il faut suivre la pierre. Plus
 * large, on appuie au hasard et la note pleine (`score-du-cairn.ts`) ne dit
 * plus rien. Rater la visée ne fait pas perdre : c'est `SEUIL_DE_CHUTE`.
 */
export const TOLERANCE = 2.5;

/**
 * L'écart au-delà duquel la pierre ne repose plus sur celle du dessous.
 *
 * Mesuré depuis la pierre qui porte, pas depuis le pointillé : poser de travers
 * ne coûte rien sur le coup et tout au coup suivant, comme un vrai empilement.
 * Avec une course de 21 à 32 unités et une période de 2400 à 1500 ms, 14 unités
 * laissent 800 ms de fenêtre sûre en bas et 330 ms en haut.
 */
export const SEUIL_DE_CHUTE = 14;

/** Aller-retour du balancier au premier rang, puis au dernier. */
const PERIODE_PREMIERE_MS = 2400;
const PERIODE_DERNIERE_MS = 1500;

/**
 * Le balancier accélère un peu en montant, pour que le jeu ait une montée et
 * pas seulement un arrêt. La tolérance, elle, ne bouge pas.
 */
export function periodeDuRang(rang: number, total: number = PIERRES_DU_JEU): number {
  if (total <= 1) return PERIODE_PREMIERE_MS;

  const avancee = Math.min(Math.max(rang, 0), total - 1) / (total - 1);

  return PERIODE_PREMIERE_MS + (PERIODE_DERNIERE_MS - PERIODE_PREMIERE_MS) * avancee;
}

/**
 * Où se trouve la pierre qui va et vient, après `temps` millisecondes.
 *
 * Onde triangulaire et non sinusoïde : une sinusoïde s'attarde aux bouts, là
 * où l'on ne veut pas poser, et file au milieu, la seule position utile.
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

/** Ce qu'il advient d'une pierre lâchée. */
export type Pose = "DAPLOMB" | "DE_TRAVERS" | "TOMBEE";

export type PierrePosee = {
  /** L'abscisse où elle repose vraiment, dans la vue de largeur 100. */
  x: number;
  pose: Pose;
};

/**
 * Ce que devient une pierre lâchée à `x`, quand le pointillé l'attendait à
 * `cible` et que `appui` est l'abscisse de ce qui la reçoit (la pierre du
 * dessous, ou la marque au sol).
 *
 * Dans la tolérance, elle se cale exactement sur la cible, et cette place tient
 * toujours, même si la pile penche : viser la marque annoncée ne peut jamais
 * faire perdre. Sinon elle reste de travers tant que la pierre du dessous la
 * porte, et au-delà elle tombe.
 */
export function poserLaPierre(
  x: number,
  cible: number,
  appui: number,
  reglage: { tolerance?: number; seuil?: number } = {},
): PierrePosee {
  const tolerance = Math.max(0, reglage.tolerance ?? TOLERANCE);
  const seuil = Math.max(0, reglage.seuil ?? SEUIL_DE_CHUTE);

  if (Math.abs(x - cible) <= tolerance) return { x: cible, pose: "DAPLOMB" };

  return { x, pose: Math.abs(x - appui) <= seuil ? "DE_TRAVERS" : "TOMBEE" };
}
