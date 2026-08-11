import { z } from "zod";
import type { AiContract } from "./contract";
import { FORMATS_DU_MECANISME, FORMATS_VERIFIABLES, question } from "./generate-variants-question";

/**
 * Quatre clés nommées par concept, et plusieurs concepts par appel.
 *
 * La facette est le nom de la clé : elle ne peut être ni répétée, ni omise, ni
 * inventée, et l'énumération des facettes disparaît du schéma. Le tableau, lui,
 * ne porte plus que le groupement — un concept par entrée, désigné par son
 * rang, celui de l'envoi.
 *
 * La validation rend un lot par concept, questions à plat dans l'ordre des
 * facettes : c'est la forme sous laquelle le reste du projet lit une
 * génération.
 */

/** Concepts traités en un appel. Au-delà, la sortie frôlerait `max_tokens`. */
export const CONCEPTS_PAR_APPEL = 3;

const lot = z.object({
  rang: z
    .number()
    .int()
    .min(1)
    .max(CONCEPTS_PAR_APPEL)
    .describe("Le numéro du concept traité, tel qu'il est donné dans l'envoi."),
  recognition: question(
    FORMATS_VERIFIABLES,
    "De quoi s'agit-il, comment le nommerait-on, à quoi le reconnaît-on.",
  ),
  mechanism: question(
    FORMATS_DU_MECANISME,
    "Pourquoi ça marche, ce qui se passe réellement, dans quel ordre.",
  ),
  boundary: question(
    FORMATS_VERIFIABLES,
    "Ce que ce n'est pas, quand ça ne s'applique pas, la confusion classique.",
  ),
  application: question(
    FORMATS_VERIFIABLES,
    "S'en servir dans une situation concrète qui n'est pas celle du concept.",
  ),
});

export const generateVariantsForme = z.object({
  lots: z
    .array(lot)
    .min(1)
    .max(CONCEPTS_PAR_APPEL)
    .describe("Un lot de quatre questions par concept reçu, un rang par concept."),
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
    const rangs = sortie.lots.map((entree) => entree.rang);

    if (new Set(rangs).size !== rangs.length) {
      ctx.addIssue({
        code: "custom",
        message: `deux lots portent le même rang : ${rangs.join(", ")}`,
        path: ["lots"],
      });
    }

    // Les deux contraintes croisées : la clé du format et le format lui-même
    // vont ensemble. Elles vivent ici et non dans la forme — un « si et
    // seulement si » ne s'exprime pas en JSON Schema sans union, et une union
    // dégraderait la grammaire envoyée au modèle.
    for (const [index, entree] of sortie.lots.entries()) {
      for (const [cle] of FACETTES) {
        const posee = entree[cle];

        if ((posee.format === "MCQ") !== ((posee.mcq ?? null) !== null)) {
          ctx.addIssue({
            code: "custom",
            message: "mcq est renseigné si et seulement si le format est MCQ",
            path: ["lots", index, cle, "mcq"],
          });
        }

        if ((posee.format === "CLOZE") !== ((posee.cloze ?? null) !== null)) {
          ctx.addIssue({
            code: "custom",
            message: "cloze est renseigné si et seulement si le format est CLOZE",
            path: ["lots", index, cle, "cloze"],
          });
        }
      }
    }
  })
  .transform((sortie) => ({
    lots: sortie.lots.map((entree) => ({
      rang: entree.rang,
      variants: FACETTES.map(([cle, facet]) => ({
        format: entree[cle].format,
        facet,
        question: entree[cle].question,
        answerKey: entree[cle].answerKey,
        options: entree[cle].mcq?.options ?? null,
        correctIndex: entree[cle].mcq?.correctIndex ?? null,
        cloze: entree[cle].cloze ?? null,
      })),
    })),
  }));

export type GenerateVariantsOutput = z.infer<typeof generateVariantsValidation>;

export const GENERATE_VARIANTS: AiContract<GenerateVariantsOutput> = {
  purpose: "generate_variants",
  forme: generateVariantsForme,
  validation: generateVariantsValidation,
};
