import { z } from "zod";
import { VariantFacet, VariantFormat } from "@/lib/db/types";
import type { AiContract } from "./contract";

const variante = z.object({
  format: z.enum(VariantFormat),
  facet: z
    .enum(VariantFacet)
    .describe("L'angle interrogé. Une facette par question, dans l'ordre de l'enum."),
  question: z.string().min(10).max(800),
  answerKey: z
    .string()
    .min(1)
    .max(2000)
    .describe("La réponse attendue en clair. Pour SHORT_ANSWER et EXPLAIN, de quoi se juger seul."),
  options: z
    .array(z.string().min(1).max(300))
    .length(4)
    .nullish()
    .describe("Les quatre options d'un MCQ. À omettre pour tout autre format."),
  correctIndex: z
    .number()
    .int()
    .min(0)
    .max(3)
    .nullish()
    .describe("L'index de la bonne option dans options. À omettre pour tout autre format."),
});

/** Les quatre formulations de question portant sur un même Atom. */
export const generateVariantsForme = z.object({
  variants: z.array(variante).length(4).describe("Quatre questions, quatre facettes différentes."),
});

function estMcq(variant: z.infer<typeof variante>): boolean {
  return variant.format === "MCQ";
}

function renseigne(valeur: unknown): boolean {
  return (valeur ?? null) !== null;
}

const generateVariantsValidation = generateVariantsForme
  .refine((sortie) => new Set(sortie.variants.map((variant) => variant.facet)).size === 4, {
    error: "les quatre variants doivent porter quatre facettes différentes",
    path: ["variants"],
  })
  // Un MCQ sans options, ou des options sur un format libre, sont deux
  // manières de rendre la question inaffichable.
  .refine(
    (sortie) =>
      sortie.variants.every(
        (variant) =>
          estMcq(variant) === renseigne(variant.options) &&
          estMcq(variant) === renseigne(variant.correctIndex),
      ),
    {
      error: "options et correctIndex sont renseignés si et seulement si le format est MCQ",
      path: ["variants"],
    },
  )
  .transform((sortie) => ({
    variants: sortie.variants.map((variant) => ({
      ...variant,
      options: variant.options ?? null,
      correctIndex: variant.correctIndex ?? null,
    })),
  }));

export type GenerateVariantsOutput = z.infer<typeof generateVariantsValidation>;

export const GENERATE_VARIANTS: AiContract<GenerateVariantsOutput> = {
  purpose: "generate_variants",
  forme: generateVariantsForme,
  validation: generateVariantsValidation,
};
