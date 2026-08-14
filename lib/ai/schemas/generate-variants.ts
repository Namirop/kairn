import { z } from "zod";
import { normaliserLesOptions } from "@/lib/domain/options-de-qcm";
import type { AiContract } from "./contract";
import {
  FORMATS_DU_MECANISME,
  FORMATS_VERIFIABLES,
  question,
  questionLue,
} from "./generate-variants-question";

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
 *
 * **Elle ne rejette plus sur un compte.** Un lot de trop, une option de trop,
 * une forme acceptée de trop : tout ça se rattrape, et un appel qui porte les
 * questions de trois concepts est trop cher pour être jeté sur un dépassement
 * que la grammaire n'a jamais fait respecter.
 */

/** Concepts traités en un appel. Au-delà, la sortie frôlerait `max_tokens`. */
export const CONCEPTS_PAR_APPEL = 3;

/** Assez de variantes pour accepter une réponse ; au-delà, on n'en lit plus. */
const FORMES_ACCEPTEES_MAXIMUM = 8;

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

/** Le même lot, relu : plus aucune borne de comptage, les énumérations restent. */
const lotLu = z.object({
  rang: z.number().int(),
  recognition: questionLue(FORMATS_VERIFIABLES),
  mechanism: questionLue(FORMATS_DU_MECANISME),
  boundary: questionLue(FORMATS_VERIFIABLES),
  application: questionLue(FORMATS_VERIFIABLES),
});

const sortieLue = z.object({ lots: z.array(lotLu).min(1) });

/** L'ordre servi, et la facette que porte chaque clé. */
const FACETTES = [
  ["recognition", "RECOGNITION"],
  ["mechanism", "MECHANISM"],
  ["boundary", "BOUNDARY"],
  ["application", "APPLICATION"],
] as const;

type QuestionLue = z.infer<typeof lotLu>["recognition"];

/**
 * Les options d'un QCM, ramenées à un jeu utilisable.
 *
 * Le cas irrécupérable — un index qui ne désigne aucune option — a déjà été
 * refusé par la validation croisée ci-dessous. Il reste traité ici parce qu'une
 * fonction qui rend `null` doit être lue jusqu'au bout, pas parce qu'il arrive.
 */
function optionsDe(posee: QuestionLue) {
  const normalisees = posee.mcq
    ? normaliserLesOptions(posee.mcq.options, posee.mcq.correctIndex)
    : null;

  return {
    options: normalisees?.options ?? null,
    correctIndex: normalisees?.correctIndex ?? null,
  };
}

const generateVariantsValidation = sortieLue
  .superRefine((sortie, ctx) => {
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

        // Le seul dépassement qu'on ne sait pas rattraper : sans savoir quelle
        // option est la bonne, servir la question reviendrait à noter faux
        // quelqu'un qui a raison. C'est l'exception assumée à la règle « on
        // tronque, on ne rejette pas » — la donnée est inexploitable, pas
        // seulement hors bornes.
        if (posee.mcq && normaliserLesOptions(posee.mcq.options, posee.mcq.correctIndex) === null) {
          ctx.addIssue({
            code: "custom",
            message: `la bonne réponse désigne l'option ${posee.mcq.correctIndex}, absente des ${posee.mcq.options.length} rendues`,
            path: ["lots", index, cle, "mcq", "correctIndex"],
          });
        }
      }
    }
  })
  .transform((sortie) => {
    // Deux lots au même rang ne se refusent plus : le premier gagne, et les
    // rangs restés sans réponse sont signalés par l'appelant. Refuser aurait
    // emporté les lots corrects du même envoi.
    const vus = new Set<number>();
    const uniques = sortie.lots.filter((entree) => {
      if (vus.has(entree.rang)) return false;

      vus.add(entree.rang);

      return true;
    });

    return {
      lots: uniques.map((entree) => ({
        rang: entree.rang,
        variants: FACETTES.map(([cle, facet]) => ({
          format: entree[cle].format,
          facet,
          question: entree[cle].question,
          answerKey: entree[cle].answerKey,
          estVraie: entree[cle].estVraie ?? null,
          ...optionsDe(entree[cle]),
          cloze: entree[cle].cloze
            ? {
                sentence: entree[cle].cloze.sentence,
                accepted: entree[cle].cloze.accepted.slice(0, FORMES_ACCEPTEES_MAXIMUM),
              }
            : null,
        })),
      })),
    };
  });

export type GenerateVariantsOutput = z.infer<typeof generateVariantsValidation>;

export const GENERATE_VARIANTS: AiContract<GenerateVariantsOutput> = {
  purpose: "generate_variants",
  forme: generateVariantsForme,
  validation: generateVariantsValidation,
};
