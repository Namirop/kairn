import type { Pose } from "./jeu-du-cairn";

/**
 * Ce que rapporte une pierre posée, et ce que la pile vaut à la fin.
 *
 * Le jeu ne comptait rien : poser d'aplomb et poser de travers menaient au même
 * endroit tant que la pile tenait, et viser juste ne se voyait que dans
 * l'inclinaison de la pierre. C'était peu pour le seul geste que la page
 * demande. Le score ne sort pas de la page — rien n'est gardé, rien n'est
 * envoyé, et le dépôt qui tourne derrière ne s'en aperçoit toujours pas. Il
 * dure le temps d'une pile.
 *
 * Les trois valeurs suivent les trois fins de `poserLaPierre`, et il n'y en a
 * pas d'autres : viser la marque vaut le double d'un posé de travers, et une
 * chute remet à zéro. Pas de bonus de série ni de multiplicateur — ce qui
 * récompense la pile parfaite est le mot qui la clôt, pas un chiffre gonflé.
 */

export const POINTS_PAR_POSE: Record<Pose, number> = {
  DAPLOMB: 2,
  DE_TRAVERS: 1,
  TOMBEE: 0,
};

export function pointsDeLaPose(pose: Pose): number {
  return POINTS_PAR_POSE[pose];
}

/**
 * Le score après une pose.
 *
 * Une chute ramène à zéro plutôt que de retrancher : on reprend la pile du sol,
 * le compte repart avec elle. Retrancher laisserait un score qui survit à un
 * cairn qui n'existe plus.
 */
export function scoreApresPose(score: number, pose: Pose): number {
  if (pose === "TOMBEE") return 0;

  return Math.max(0, score) + pointsDeLaPose(pose);
}

/**
 * Comment la pile s'est terminée, ou `null` si elle n'est pas finie.
 *
 * `PARFAIT` demande que **toutes** les pierres soient d'aplomb : c'est le seul
 * moment où le jeu a quelque chose à dire, et le diluer sur « presque » le
 * rendrait muet. `TENU` est la fin ordinaire — la pile est montée, elle penche
 * un peu, elle tient.
 */
export type FinDuCairn = "PARFAIT" | "TENU";

export function finDuCairn(poses: Pose[], total: number): FinDuCairn | null {
  if (total <= 0 || poses.length < total) return null;
  if (poses.some((pose) => pose === "TOMBEE")) return null;

  return poses.every((pose) => pose === "DAPLOMB") ? "PARFAIT" : "TENU";
}
