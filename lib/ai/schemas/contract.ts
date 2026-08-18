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

/**
 * Les intentions du produit. Ce sont elles qui ont un prompt système en réserve
 * et une fixture de mode mock, parce que ce sont elles qui doivent tourner sans
 * un seul appel réel.
 */
export const AI_PURPOSES = ["extract_atoms", "generate_variants", "ocr_extract"] as const;

export type AiPurposeProduit = (typeof AI_PURPOSES)[number];

/**
 * Les intentions du banc : les trois juges de l'instrument de mesure.
 *
 * Elles passent par `callAI()` comme tout le reste — la règle du point d'entrée
 * unique ne souffre pas d'exception, et le registre `AiCall` doit voir ces
 * appels comme les autres. Mais elles sont déclarées à part, et elles n'ont ni
 * prompt en réserve ni fixture : leur prompt voyage avec le juge qui l'émet, et
 * **le banc refuse de démarrer en mode mock**. Juger des fixtures ne mesurerait
 * rien ; c'est le seul endroit du projet dont l'objet est de dépenser.
 *
 * Les recenser ici plutôt qu'ailleurs a une raison : `purpose` est la colonne
 * par laquelle on relit la dépense, et une intention inconnue du registre
 * arriverait dans les comptes sous une chaîne libre.
 */
export const AI_PURPOSES_BANC = ["juge_residu", "juge_fidelite", "juge_doublon"] as const;

export type AiPurposeBanc = (typeof AI_PURPOSES_BANC)[number];

export type AiPurpose = AiPurposeProduit | AiPurposeBanc;

/** Une intention du banc ne connaît ni prompt en réserve ni fixture. */
export function estUneIntentionDeBanc(purpose: AiPurpose): purpose is AiPurposeBanc {
  return AI_PURPOSES_BANC.some((intention) => intention === purpose);
}
