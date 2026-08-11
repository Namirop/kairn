import { z } from "zod";
import { VariantFormat } from "@/lib/db/types";
import { TROU } from "@/lib/domain/reponse-cloze";
import type { AiContract } from "./contract";

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

/**
 * Ce qu'un CLOZE ajoute : la phrase trouée, et de quoi vérifier la saisie sans
 * rappeler le modèle.
 *
 * La tolérance se paie ici, une fois, à la génération. La comparaison, elle,
 * vit dans `lib/domain/reponse-cloze.ts` : instantanée et gratuite à chaque
 * passage. Le terme masqué vient en premier — c'est celui qu'on montre quand la
 * réponse ne correspond pas, et celui dont on mesure la longueur.
 */
function cloze() {
  return z.object({
    sentence: z
      .string()
      .min(10)
      .max(600)
      .describe(`La phrase du concept, le terme masqué remplacé par ${TROU}.`),
    accepted: z
      .array(z.string().min(1).max(120))
      .min(1)
      .max(8)
      .describe("Les formes acceptées, le terme masqué d'abord, puis ses variantes."),
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
      cloze: cloze().nullish().describe("À renseigner si et seulement si format vaut CLOZE."),
    })
    .describe(facette);
}

const lot = z.object({
  rang: z
    .number()
    .int()
    .min(1)
    .max(CONCEPTS_PAR_APPEL)
    .describe("Le numéro du concept traité, tel qu'il est donné dans l'envoi."),
  recognition: question("De quoi s'agit-il, comment le nommerait-on, à quoi le reconnaît-on."),
  mechanism: question("Pourquoi ça marche, ce qui se passe réellement, dans quel ordre."),
  boundary: question("Ce que ce n'est pas, quand ça ne s'applique pas, la confusion classique."),
  application: question("S'en servir dans une situation concrète qui n'est pas celle du concept."),
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
