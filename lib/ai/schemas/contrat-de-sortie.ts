import type { ZodType } from "zod";

/**
 * `forme` est la seule source du schéma de sortie montré au modèle. `validation`
 * relit sa réponse, avec les contraintes croisées entre champs que JSON Schema
 * n'exprime pas et qui appauvriraient la dérivation.
 */
export type ContratDeSortie<T> = {
  purpose: IntentionDAppel;
  forme: ZodType;
  validation: ZodType<T>;
};

/** Chacune a un prompt système en réserve et une fixture de mode mock. */
export const INTENTIONS_DU_PRODUIT = ["extract_atoms", "generate_variants", "ocr_extract"] as const;

export type IntentionDuProduit = (typeof INTENTIONS_DU_PRODUIT)[number];

/**
 * Les juges du banc passent par `callAI()` sans prompt en réserve ni fixture : le
 * prompt voyage avec le juge, et juger des fixtures ne mesurerait rien. Recensés
 * ici parce que `purpose` est la colonne qui relit la dépense.
 */
export const INTENTIONS_DU_BANC = [
  "juge_residu",
  "juge_fidelite",
  "juge_doublon",
  "juge_attendus",
] as const;

export type IntentionDuBanc = (typeof INTENTIONS_DU_BANC)[number];

export type IntentionDAppel = IntentionDuProduit | IntentionDuBanc;

export function estUneIntentionDeBanc(purpose: IntentionDAppel): purpose is IntentionDuBanc {
  return INTENTIONS_DU_BANC.some((intention) => intention === purpose);
}
