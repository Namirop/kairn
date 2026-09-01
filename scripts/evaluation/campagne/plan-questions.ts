import { GENERATE_VARIANTS_PROMPT } from "@/lib/ai/prompts/generate-variants";
import { CONCEPTS_PAR_APPEL } from "@/lib/ai/schemas";
import { conceptsAQuestionner } from "@/lib/domain/nature-du-depot";
import type { DepotFige } from "../fige";
import { SYSTEM_FIDELITE } from "../juges/fidelite";
import type { ModeleOpenRouter } from "../openrouter/modeles";
import { ajouterPlans, couterPlan, SURCHARGE_JSON_ITEM, tok, type Plan } from "./plan";

/**
 * L'estimation par colonne pour la campagne 2 — génération de questions par
 * un challenger sur les concepts figés du 11h58, plus le juge de fidélité
 * Haiku sur chaque concept qui reçoit des questions.
 *
 * Radotage, cible vrai/faux et couverture des formats sont des mesures
 * **géométriques ou internes** — pas de juge LLM, pas de dépense. Elles ne
 * figurent donc pas dans le plan chiffré.
 *
 * Le proxy est Sonnet : ses questions au figé `11h58` servent de volume de
 * sortie attendu par appel (12 questions par appel = 4 facettes × 3 concepts).
 * Marge d'erreur ~20 % assumée pour un plan à sec ; la facture réelle se lira
 * sur OpenRouter dépôt par dépôt à l'émission.
 */

/** Combien de concepts, sur ce dépôt, reçoivent des questions (uncertain écartés selon la nature). */
export function conceptsQuestionnables(depot: DepotFige): number {
  return conceptsAQuestionner(depot.concepts, depot.nature).length;
}

/**
 * La génération, un appel par groupe de {@link CONCEPTS_PAR_APPEL} concepts
 * questionnables. Un dépôt sans concept questionnable ne fait pas d'appel.
 *
 * Tokens d'entrée : prompt `generate_variants` + les 3 concepts formatés dans
 * l'envoi + une petite surcharge par concept. Tokens de sortie : ce que Sonnet
 * a rendu au figé (12 questions par appel), proxy à ~20 % près.
 */
export function planGeneration(fige: { depots: DepotFige[] }): Plan {
  const promptTokens = tok(GENERATE_VARIANTS_PROMPT);
  let appels = 0;
  let tokensIn = 0;
  let tokensOut = 0;

  for (const depot of fige.depots) {
    const questionnables = conceptsAQuestionner(depot.concepts, depot.nature);
    if (questionnables.length === 0) continue;

    const nbAppels = Math.ceil(questionnables.length / CONCEPTS_PAR_APPEL);
    appels += nbAppels;

    // Tokens de sortie du dépôt : somme sur les concepts questionnables des
    // variants déjà rendus par Sonnet. Un concept sans variants (concept
    // ancien du figé, avant persistance des questions) est ignoré — sur `11h58`
    // les questions sont toutes présentes, aucune exclusion n'est déclenchée.
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
      // Enveloppe : `{"lots": [{"rang": N, "recognition": {...}, ...}, ...]}`.
      tokensOut += 40;
    }

    // Tokens d'entrée par appel : prompt + les 3 concepts (~100 chars par
    // concept en moyenne) + enveloppe utilisateur. Le dernier lot peut porter
    // 1 ou 2 concepts au lieu de 3 — approximation acceptable au plan à sec.
    const tailleConceptMoyenne =
      questionnables.reduce((s, c) => s + tok(c.concept), 0) / questionnables.length;
    tokensIn += Math.round(
      nbAppels * (promptTokens + CONCEPTS_PAR_APPEL * (tailleConceptMoyenne + 30) + 80),
    );
  }

  return { appels, tokensIn, tokensOut };
}

/**
 * Le juge de fidélité — un appel par concept qui reçoit des questions.
 *
 * Contenu : `SYSTEM_FIDELITE` + le concept + ses questions (avec options et
 * réponse-étalon). Sortie : un verdict court par question, 4 par appel.
 */
export function planFidelite(fige: { depots: DepotFige[] }): Plan {
  const promptTokens = tok(SYSTEM_FIDELITE);
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
      plan.tokensIn += promptTokens + inConcept + 80;
      // Sortie : un verdict par question (~30 tokens) + surcharge JSON.
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
