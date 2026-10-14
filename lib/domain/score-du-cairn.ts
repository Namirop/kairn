import type { Pose } from "./jeu-du-cairn";

/**
 * Ce que rapporte une pierre posée, et ce que la pile vaut à la fin. Le score
 * ne sort pas de la page : rien n'est gardé ni envoyé, il dure le temps d'une
 * pile.
 *
 * Une valeur par fin de `poserLaPierre`. Pas de bonus de série ni de
 * multiplicateur : la pile parfaite est récompensée par le mot qui la clôt.
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
 * Le score après une pose. Une chute remet à zéro plutôt que de retrancher : le
 * score ne survit pas au cairn tombé.
 */
export function scoreApresPose(score: number, pose: Pose): number {
  if (pose === "TOMBEE") return 0;

  return Math.max(0, score) + pointsDeLaPose(pose);
}

/**
 * Comment la pile s'est terminée, ou `null` si elle n'est pas finie.
 * `PARFAIT` exige que toutes les pierres soient d'aplomb, sans quoi le mot
 * perdrait son sens ; `TENU` est la fin ordinaire.
 */
export type FinDuCairn = "PARFAIT" | "TENU";

export function finDuCairn(poses: Pose[], total: number): FinDuCairn | null {
  if (total <= 0 || poses.length < total) return null;
  if (poses.some((pose) => pose === "TOMBEE")) return null;

  return poses.every((pose) => pose === "DAPLOMB") ? "PARFAIT" : "TENU";
}
