import { controlerLEnonce } from "./controle-de-lenonce";
import { controlerLeFormat } from "./controle-du-format";
import type { Manquement } from "./manquement";

/** Une question prise à part ; la composition du lot se contrôle dans `controle-variants.ts`. */

export type VariantAControler = {
  format: string;
  facet: string;
  question: string;
  answerKey: string;
  options: string[] | null;
  correctIndex: number | null;
  cloze?: { sentence: string; accepted: string[]; leurres?: string[] } | null;
  /** Ce que le modèle déclare. */
  estVraie?: boolean | null;
  /** Le verdict que l'envoi demandait, absent quand l'appelant ne le connaît pas. */
  cible?: boolean | null;
  /** Une charge jointe à un format qui n'en porte pas, écartée à la relecture. */
  chargeIgnoree?: boolean;
};

export { ECART_MAX_OPTIONS, ECART_MINIMUM_SIGNIFICATIF } from "./controle-du-format";
export { MOTS_MAX_DU_TROU } from "./controle-du-trou";

export function controlerQuestion(variant: VariantAControler): Manquement[] {
  return [...controlerLeFormat(variant), ...controlerLEnonce(variant)];
}
