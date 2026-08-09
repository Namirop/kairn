import { z, type ZodType } from "zod";
import { AIConfigError } from "./errors";

/** Forme attendue par l'API pour les paramètres d'un outil. */
export type ToolInputSchema = {
  type: "object";
  properties?: unknown;
  required?: string[];
  [key: string]: unknown;
};

/**
 * Dérive le schéma d'entrée de l'outil depuis le schéma Zod.
 *
 * C'est ce qui rend la sortie structurée : le modèle remplit les paramètres
 * d'un outil dont la forme vient du même schéma que la validation. Aucune
 * consigne « réponds en JSON » n'est nécessaire, et les deux ne peuvent pas
 * diverger.
 */
export function toToolInputSchema(schema: ZodType): ToolInputSchema {
  // Zod 4 produit déjà `required` et `additionalProperties: false`, ce
  // qu'attend l'API. Seul l'en-tête `$schema` n'a pas sa place ici.
  const { $schema, type, ...rest } = z.toJSONSchema(schema, {
    target: "draft-2020-12",
    io: "input",
  });

  if (type !== "object") {
    throw new AIConfigError(
      `Les paramètres d'un outil doivent être un objet, reçu « ${String(type)} ».`,
    );
  }

  return { type: "object", ...rest };
}
