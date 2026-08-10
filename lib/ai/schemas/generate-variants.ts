import { z } from "zod";
import { VariantFormat } from "@/lib/db/types";
import type { AiContract } from "./contract";

/**
 * Quatre clés nommées, pas un tableau.
 *
 * Le premier passage du banc a rendu seize sorties où `variants` arrivait en
 * chaîne : le modèle sérialisait le tableau au lieu de l'émettre. Un tableau
 * qui n'existe pas ne se sérialise pas. La facette devient le nom de la clé,
 * ce qui retire du même coup l'énumération des facettes, le contrôle de leur
 * unicité et celui de la cardinalité — la structure les impose.
 *
 * Les prompts ne changent pas : ils décrivent déjà quatre facettes, dans cet
 * ordre. La validation rend un tableau ordonné, forme sous laquelle le reste
 * du projet lit une génération.
 */

/** Ce qu'un MCQ ajoute. Une clé facultative plutôt que deux champs à annuler. */
function mcq() {
  return z.object({
    options: z
      .array(z.string().min(1).max(300))
      .length(4)
      .describe("Les quatre options, de longueur comparable."),
    correctIndex: z.number().int().min(0).max(3).describe("L'index de la bonne option."),
  });
}

function question(facette: string) {
  return z
    .object({
      format: z.enum(VariantFormat),
      question: z.string().min(10).max(800),
      answerKey: z
        .string()
        .min(1)
        .max(2000)
        .describe("La réponse attendue en clair. Pour SHORT_ANSWER et EXPLAIN, de quoi se juger."),
      mcq: mcq().nullish().describe("À renseigner si et seulement si format vaut MCQ."),
    })
    .describe(facette);
}

export const generateVariantsForme = z.object({
  recognition: question("De quoi s'agit-il, comment le nommerait-on, à quoi le reconnaît-on."),
  mechanism: question("Pourquoi ça marche, ce qui se passe réellement, dans quel ordre."),
  boundary: question("Ce que ce n'est pas, quand ça ne s'applique pas, la confusion classique."),
  application: question("S'en servir dans une situation concrète qui n'est pas celle du concept."),
});

/** L'ordre servi, et la facette que porte chaque clé. */
const FACETTES = [
  ["recognition", "RECOGNITION"],
  ["mechanism", "MECHANISM"],
  ["boundary", "BOUNDARY"],
  ["application", "APPLICATION"],
] as const;

const generateVariantsValidation = generateVariantsForme
  .superRefine((sortie, ctx) => {
    for (const [cle] of FACETTES) {
      const posee = sortie[cle];
      const porteUnMcq = (posee.mcq ?? null) !== null;

      if ((posee.format === "MCQ") !== porteUnMcq) {
        ctx.addIssue({
          code: "custom",
          message: "mcq est renseigné si et seulement si le format est MCQ",
          path: [cle, "mcq"],
        });
      }
    }
  })
  .transform((sortie) => ({
    variants: FACETTES.map(([cle, facet]) => ({
      format: sortie[cle].format,
      facet,
      question: sortie[cle].question,
      answerKey: sortie[cle].answerKey,
      options: sortie[cle].mcq?.options ?? null,
      correctIndex: sortie[cle].mcq?.correctIndex ?? null,
    })),
  }));

export type GenerateVariantsOutput = z.infer<typeof generateVariantsValidation>;

export const GENERATE_VARIANTS: AiContract<GenerateVariantsOutput> = {
  purpose: "generate_variants",
  forme: generateVariantsForme,
  validation: generateVariantsValidation,
};
