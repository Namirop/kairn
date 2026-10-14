import type { ZodType } from "zod";

/**
 * Un contrat porte deux schémas. `forme` est ce qu'on montre au modèle : seule
 * source de l'`input_schema` de l'outil. `validation` s'applique à sa réponse :
 * la même forme plus les contraintes croisées entre champs, que JSON Schema
 * n'exprime pas et qui appauvriraient la dérivation.
 */
export type ContratDeSortie<T> = {
  purpose: IntentionDAppel;
  forme: ZodType;
  validation: ZodType<T>;
};

/**
 * Les intentions du produit : chacune a un prompt système en réserve et une
 * fixture de mode mock, pour tourner sans un seul appel réel.
 */
export const INTENTIONS_DU_PRODUIT = ["extract_atoms", "generate_variants", "ocr_extract"] as const;

export type IntentionDuProduit = (typeof INTENTIONS_DU_PRODUIT)[number];

/**
 * Les intentions du banc : les juges de l'instrument de mesure.
 *
 * Elles passent par `callAI()` comme tout le reste (point d'entrée unique,
 * traçabilité dans `AiCall`), mais sans prompt en réserve ni fixture : le
 * prompt voyage avec le juge, et le banc refuse de démarrer en mode mock, juger
 * des fixtures ne mesurant rien.
 *
 * Recensées ici parce que `purpose` est la colonne par laquelle on relit la
 * dépense : une intention inconnue y arriverait en chaîne libre.
 */
export const INTENTIONS_DU_BANC = [
  "juge_residu",
  "juge_fidelite",
  "juge_doublon",
  "juge_attendus",
] as const;

export type IntentionDuBanc = (typeof INTENTIONS_DU_BANC)[number];

export type IntentionDAppel = IntentionDuProduit | IntentionDuBanc;

/** Une intention du banc ne connaît ni prompt en réserve ni fixture. */
export function estUneIntentionDeBanc(purpose: IntentionDAppel): purpose is IntentionDuBanc {
  return INTENTIONS_DU_BANC.some((intention) => intention === purpose);
}
