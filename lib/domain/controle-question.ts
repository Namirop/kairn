import { controlerLEnonce } from "./controle-de-lenonce";
import { controlerLeFormat } from "./controle-du-format";
import type { Manquement } from "./manquement";

/**
 * Ce qui se vérifie sur une question prise à part, sans regarder ses voisines :
 * ce que son format lui impose, et la réponse qui se lirait dans l'énoncé.
 *
 * La composition du lot — les quatre facettes, la diversité des formats, le
 * quota de texte libre — se contrôle ailleurs : voir `controle-variants.ts`.
 */

export type VariantAControler = {
  format: string;
  facet: string;
  question: string;
  answerKey: string;
  options: string[] | null;
  correctIndex: number | null;
  cloze?: { sentence: string; accepted: string[]; leurres?: string[] } | null;
  /** Ce que le modèle déclare : l'affirmation posée est-elle vraie. */
  estVraie?: boolean | null;
  /** Ce que l'envoi lui demandait. Absente quand l'appelant ne la connaît pas. */
  cible?: boolean | null;
  /** Une charge jointe à un format qui n'en porte pas, écartée à la relecture. */
  chargeIgnoree?: boolean;
};

export { ECART_MAX_OPTIONS, ECART_MINIMUM_SIGNIFICATIF } from "./controle-du-format";
export { MOTS_MAX_DU_TROU } from "./controle-du-trou";

/** Tout ce qu'on peut reprocher à une question sans regarder les autres. */
export function controlerQuestion(variant: VariantAControler): Manquement[] {
  return [...controlerLeFormat(variant), ...controlerLEnonce(variant)];
}
