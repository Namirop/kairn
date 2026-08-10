import type { ZodType } from "zod";

/**
 * Un contrat porte deux schémas, et c'est tout l'intérêt de le séparer en deux.
 *
 * `forme` est ce qu'on montre au modèle : la structure, les types, les
 * énumérations. C'est de là, et de nulle part ailleurs, qu'on dérive
 * l'`input_schema` de l'outil.
 *
 * `validation` est ce qu'on applique à sa réponse : la même forme, plus les
 * contraintes croisées entre champs. Une contrainte croisée ne s'exprime pas
 * en JSON Schema — la montrer au modèle ne l'aiderait pas, et la faire
 * traverser la dérivation risquerait d'appauvrir ce qu'il voit.
 */
export type AiContract<T> = {
  purpose: AiPurpose;
  forme: ZodType;
  validation: ZodType<T>;
};

export const AI_PURPOSES = ["extract_atoms", "generate_variants", "ocr_extract"] as const;

export type AiPurpose = (typeof AI_PURPOSES)[number];
