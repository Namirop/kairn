import { PROMPT_DE_QUESTIONS } from "@/lib/ai/prompts";
import { CONCEPTS_PAR_APPEL } from "@/lib/ai/schemas";
import { conceptsAQuestionner } from "@/lib/domain/nature-du-depot";
import type { DepotFige } from "../fige";
import { SYSTEM_FIDELITE } from "../juges/fidelite";
import type { ModeleOpenRouter } from "../openrouter/modeles";
import { ajouterPlans, couterPlan, SURCHARGE_JSON_ITEM, tok, type Plan } from "./plan";

/**
 * L'estimation par colonne de la campagne 2 : génération de questions par un
 * challenger sur les concepts du figé `11h58`, plus le juge de fidélité Haiku
 * sur chaque concept questionné. Les autres mesures (radotage, cible vrai ou
 * faux, formats) ne coûtent aucun appel et n'y figurent pas.
 *
 * Les questions de Sonnet au figé servent de proxy du volume de sortie, à
 * ~20 % près.
 */

/** Les concepts du dépôt qui reçoivent des questions ; les `uncertain` en sortent selon la nature. */
export function conceptsQuestionnables(depot: DepotFige): number {
  return conceptsAQuestionner(depot.concepts, depot.nature).length;
}

/**
 * La génération, un appel par groupe de {@link CONCEPTS_PAR_APPEL} concepts
 * questionnables.
 */
export function planGeneration(fige: { depots: DepotFige[] }): Plan {
  const tokensDuPrompt = tok(PROMPT_DE_QUESTIONS);
  let appels = 0;
  let tokensIn = 0;
  let tokensOut = 0;

  for (const depot of fige.depots) {
    const questionnables = conceptsAQuestionner(depot.concepts, depot.nature);
    if (questionnables.length === 0) continue;

    const nbAppels = Math.ceil(questionnables.length / CONCEPTS_PAR_APPEL);
    appels += nbAppels;

    // Un concept figé sans questions ne compte rien en sortie.
    for (const concept of questionnables) {
      const variants = concept.variants ?? [];
      for (const variant of variants) {
        tokensOut += tok(variant.question) + tok(variant.answerKey);
        if (variant.options) {
          for (const option of variant.options) tokensOut += tok(option);
        }
        if (variant.cloze) {
          tokensOut += tok(variant.cloze.sentence);
          for (const forme of variant.cloze.accepted) tokensOut += tok(forme);
        }
        tokensOut += SURCHARGE_JSON_ITEM;
      }
      // L'enveloppe du lot.
      tokensOut += 40;
    }

    // Chaque appel est compté plein, même un dernier lot plus court :
    // l'écart est sous la marge du plan.
    const tailleConceptMoyenne =
      questionnables.reduce((s, c) => s + tok(c.concept), 0) / questionnables.length;
    tokensIn += Math.round(
      nbAppels * (tokensDuPrompt + CONCEPTS_PAR_APPEL * (tailleConceptMoyenne + 30) + 80),
    );
  }

  return { appels, tokensIn, tokensOut };
}

/** Le juge de fidélité : un appel par concept questionné, un verdict par question. */
export function planFidelite(fige: { depots: DepotFige[] }): Plan {
  const tokensDuPrompt = tok(SYSTEM_FIDELITE);
  const plan: Plan = { appels: 0, tokensIn: 0, tokensOut: 0 };

  for (const depot of fige.depots) {
    const questionnables = conceptsAQuestionner(depot.concepts, depot.nature);
    for (const concept of questionnables) {
      const variants = concept.variants ?? [];
      if (variants.length === 0) continue;
      plan.appels += 1;

      let inConcept = tok(concept.concept);
      for (const variant of variants) {
        inConcept += tok(variant.question) + tok(variant.answerKey);
        if (variant.options) {
          for (const option of variant.options) inConcept += tok(option);
        }
      }
      plan.tokensIn += tokensDuPrompt + inConcept + 80;
      plan.tokensOut += variants.length * (30 + SURCHARGE_JSON_ITEM) + 30;
    }
  }

  return plan;
}

export type EstimationColonne = {
  generation: Plan;
  fidelite: Plan;
  coutGeneration: number;
  coutFidelite: number;
  coutTotal: number;
};

export function estimerColonne(
  fige: { depots: DepotFige[] },
  challenger: ModeleOpenRouter,
  juge: ModeleOpenRouter,
): EstimationColonne {
  const generation = planGeneration(fige);
  const fidelite = planFidelite(fige);
  const coutGeneration = couterPlan(generation, challenger);
  const coutFidelite = couterPlan(fidelite, juge);
  return {
    generation,
    fidelite,
    coutGeneration,
    coutFidelite,
    coutTotal: coutGeneration + coutFidelite,
  };
}

export { ajouterPlans, couterPlan };
