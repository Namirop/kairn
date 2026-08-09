import { z } from "zod";
import { VariantFormat } from "@/lib/db/types";

/**
 * Forme attendue des trois sorties du modèle. Ces schémas servent deux fois :
 * ils dérivent l'outil envoyé au modèle, et ils valident ce qu'il rend. Une
 * sortie qui ne passe pas ici marque le job en échec.
 */

export const AI_PURPOSES = ["extract_atoms", "generate_variants", "ocr_extract"] as const;

export type AiPurpose = (typeof AI_PURPOSES)[number];

/** Un Input découpé en concepts unitaires. */
export const extractAtomsSchema = z.object({
  atoms: z
    .array(
      z.object({
        concept: z
          .string()
          .min(20)
          .max(400)
          .describe("Le concept, formulé comme une affirmation autonome et vérifiable."),
        tags: z
          .array(z.string().min(2).max(24))
          .min(1)
          .max(4)
          .describe("Étiquettes techniques en minuscules, sans accent ni espace."),
      }),
    )
    .min(1)
    .max(8)
    .describe("Un concept par idée distincte. Une phrase isolée n'en produit qu'un."),
});

export type ExtractAtomsOutput = z.infer<typeof extractAtomsSchema>;

/** Trois à quatre formulations de question portant sur un même Atom. */
export const generateVariantsSchema = z.object({
  variants: z
    .array(
      z.object({
        format: z.enum(VariantFormat),
        question: z.string().min(10).max(500),
        answerKey: z.string().min(1).max(2000),
        options: z
          .array(z.string().min(1).max(300))
          .min(2)
          .max(5)
          .optional()
          .describe("Uniquement pour MCQ. La bonne réponse figure dans la liste."),
        language: z
          .string()
          .min(1)
          .max(20)
          .optional()
          .describe("Uniquement pour CODE. Identifiant de langage, ex. « sql »."),
      }),
    )
    .min(3)
    .max(4)
    .describe("Des formats différents entre eux, pour ne pas mémoriser une tournure."),
});

export type GenerateVariantsOutput = z.infer<typeof generateVariantsSchema>;

/** Le texte tiré d'une capture d'écran. */
export const ocrExtractSchema = z.object({
  text: z.string().max(20_000).describe("Le texte lu, mis en forme mais non reformulé."),
  confidence: z
    .enum(["HIGH", "MEDIUM", "LOW"])
    .describe("LOW quand l'image est floue, coupée ou en grande partie illisible."),
});

export type OcrExtractOutput = z.infer<typeof ocrExtractSchema>;

/** Nom de l'outil exposé au modèle, par intention. */
export const TOOL_NAMES: Record<AiPurpose, string> = {
  extract_atoms: "enregistrer_concepts",
  generate_variants: "enregistrer_questions",
  ocr_extract: "enregistrer_texte_lu",
};
