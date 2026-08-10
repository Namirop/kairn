import { z } from "zod";
import { VariantFacet, VariantFormat } from "@/lib/db/types";

/**
 * Forme attendue des trois sorties du modèle. Ces schémas servent deux fois :
 * ils dérivent l'outil envoyé au modèle, et ils valident ce qu'il rend. Une
 * sortie qui ne passe pas ici marque le job en échec, elle n'est pas réparée.
 *
 * Les champs portent exactement les noms cités dans `lib/ai/prompts/` : le
 * prompt décrit à l'écrit ce que le schéma impose à la machine.
 */

export const AI_PURPOSES = ["extract_atoms", "generate_variants", "ocr_extract"] as const;

export type AiPurpose = (typeof AI_PURPOSES)[number];

/** Un Input découpé en concepts unitaires, ou rien du tout avec son motif. */
export const extractAtomsSchema = z
  .object({
    atoms: z
      .array(
        z.object({
          concept: z
            .string()
            .min(20)
            .max(600)
            .describe("Une à trois phrases, autoportantes, sans renvoi au texte d'origine."),
          tags: z
            .array(z.string().min(2).max(24))
            .min(1)
            .max(3)
            .describe(
              "Minuscules, sans accent ni espace. Elles regroupent, elles ne décrivent pas.",
            ),
          uncertain: z
            .boolean()
            .describe(
              "Vrai si l'affirmation déposée paraît nettement fausse. Elle est extraite telle quelle.",
            ),
        }),
      )
      .max(12)
      .describe("Autant que le contenu en porte. Vide si le dépôt ne donne aucun concept."),
    rejected: z
      .string()
      .min(1)
      .max(300)
      .nullable()
      .describe("Une phrase à la deuxième personne, renseignée seulement quand atoms est vide."),
  })
  // Les deux champs se répondent : un rejet sans motif ne dit rien à
  // l'utilisateur, un motif à côté de concepts extraits se contredit.
  .refine((output) => (output.atoms.length === 0) === (output.rejected !== null), {
    error: "rejected doit être renseigné si et seulement si atoms est vide",
    path: ["rejected"],
  });

export type ExtractAtomsOutput = z.infer<typeof extractAtomsSchema>;

const variantSchema = z.object({
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
    .nullable()
    .describe("Exactement quatre options pour un MCQ, nul pour tout autre format."),
  correctIndex: z
    .number()
    .int()
    .min(0)
    .max(3)
    .nullable()
    .describe("Index de la bonne option dans options pour un MCQ, nul pour tout autre format."),
});

/** Les quatre formulations de question portant sur un même Atom. */
export const generateVariantsSchema = z
  .object({
    variants: z
      .array(variantSchema)
      .length(4)
      .describe("Quatre questions, quatre facettes différentes."),
  })
  .refine((output) => new Set(output.variants.map((variant) => variant.facet)).size === 4, {
    error: "les quatre variants doivent porter quatre facettes différentes",
    path: ["variants"],
  })
  // Un MCQ sans options, ou des options sur un format libre, sont deux
  // manières de rendre la question inaffichable.
  .refine(
    (output) =>
      output.variants.every(
        (variant) =>
          (variant.format === "MCQ") === (variant.options !== null) &&
          (variant.format === "MCQ") === (variant.correctIndex !== null),
      ),
    {
      error: "options et correctIndex sont renseignés si et seulement si le format est MCQ",
      path: ["variants"],
    },
  );

export type GenerateVariantsOutput = z.infer<typeof generateVariantsSchema>;

function porteDuTexte(texte: string): boolean {
  return texte.trim().length > 0;
}

/** Le texte tiré d'une capture d'écran. */
export const ocrExtractSchema = z
  .object({
    extractedText: z
      .string()
      .max(20_000)
      .describe(
        "Le contenu substantiel, sans l'habillage d'interface. Vide si l'image n'en porte pas.",
      ),
    language: z
      .string()
      .regex(/^[a-z]{2}$/)
      .nullable()
      .describe("Code ISO 639-1 de la langue lue, en minuscules. Nul si rien n'a été lu."),
    usable: z
      .boolean()
      .describe("Faux si l'image ne porte rien à retenir : ni texte, ni texte lisible."),
  })
  // Une image sans texte n'a pas de langue : exiger un code ISO ferait
  // inventer une réponse, et une réponse inventée casse un cas normal.
  .refine((output) => output.usable === porteDuTexte(output.extractedText), {
    error: "extractedText est vide si et seulement si usable est faux",
    path: ["extractedText"],
  })
  .refine((output) => output.usable === (output.language !== null), {
    error: "language est renseigné si et seulement si usable est vrai",
    path: ["language"],
  });

export type OcrExtractOutput = z.infer<typeof ocrExtractSchema>;

/** Nom de l'outil exposé au modèle, par intention. */
export const TOOL_NAMES: Record<AiPurpose, string> = {
  extract_atoms: "enregistrer_concepts",
  generate_variants: "enregistrer_questions",
  ocr_extract: "enregistrer_texte_lu",
};
