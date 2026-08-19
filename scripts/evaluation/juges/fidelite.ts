import { z } from "zod";
import { callAI } from "@/lib/ai/client";
import type { AiContract } from "@/lib/ai/schemas";
import type { VariantFige } from "../fige";
import { MODELE_DES_JUGES, MOTIF_MAXIMUM, TOKENS_DES_JUGES } from "./modele";

/**
 * Le juge de fidélité — un concept, ses questions, sans le dépôt.
 *
 * C'est la règle absolue de ce juge, et elle vient d'une leçon précise. Avec le
 * dépôt sous les yeux, tout se justifie : c'est le mécanisme qui a laissé
 * passer, sur `08`, une question à trou dont la réponse-étalon (`banane`)
 * n'apparaissait pas dans le concept. Un relecteur qui avait le texte l'avait
 * complétée mentalement, et la fixture était devenue légitime rétrospectivement.
 *
 * Le juge doit être dans le même état d'information que la personne qui
 * révisera. On lui donne le concept et ses questions, rien d'autre — pas le
 * dépôt, pas les concepts voisins, pas les tags.
 *
 * **La réponse-étalon fait partie du jugement**, au même titre que la question.
 * Un `answerKey` qui explique par des raisons absentes du concept (les cas `08`
 * et `25`) est une violation, même si la question elle-même paraît sage.
 *
 * Un appel par concept, ses questions groupées. ~65-130 appels Haiku par
 * passage complet, 0,10 à 0,40 $.
 */

const verdictQuestion = z.object({
  numero: z
    .number()
    .int()
    .describe("Le numéro de la question jugée, tel que présenté (### Question N)."),
  juste: z
    .boolean()
    .describe(
      "true si la question se répond avec ce concept et rien d'autre — sans ajouter un chiffre, une cause, un exemple absent du concept.",
    ),
  motif: z
    .string()
    .describe(
      "Une phrase courte qui nomme la raison manquante dans le concept, ou confirme que la réponse s'y déduit.",
    ),
});

const sortieLue = z.object({
  questions: z
    .array(verdictQuestion)
    .describe("Un verdict par question soumise. L'appariement se fait par numéro."),
});

const fideliteForme = sortieLue.extend({
  questions: z.array(
    verdictQuestion.extend({ motif: verdictQuestion.shape.motif.min(1).max(MOTIF_MAXIMUM) }),
  ),
});

const fideliteValidation = sortieLue;

/** `juste: null` = abstention (question non rendue par le juge). Voir `residu.ts`. */
export type VerdictFidelite = { juste: boolean | null; motif: string };

const CONTRAT: AiContract<z.infer<typeof fideliteValidation>> = {
  purpose: "juge_fidelite",
  forme: fideliteForme,
  validation: fideliteValidation,
};

const SYSTEM = `Tu vérifies qu'une question se répond avec un concept — et ce
concept seul.

Tu ne vois pas le texte d'origine. Tu vois le concept, la question et sa
réponse-étalon. Mets-toi dans l'état de la personne qui révisera : elle n'a
accès qu'à ce concept. Si la réponse-étalon s'appuie sur un fait, un chiffre,
une cause, un exemple qui ne figure pas dans le concept — même si ce fait est
vrai, même si le lecteur pourrait le deviner — la question n'est pas juste.

Elle est juste, en revanche, si la réponse-étalon se déduit du concept sans
apport extérieur. Les reformulations, les synonymes, les inversions logiques
sont admis tant qu'ils portent sur ce que le concept dit.

Pour un QCM, les options font partie de la question — juge la réponse correcte
en fonction du concept. La plausibilité des distracteurs est hors sujet ici.

Chaque question porte un numéro (### Question N). **Reporte ce numéro dans le
verdict.** Un verdict par question, jamais deux, jamais zéro.

Le motif est court : nomme ce qui manque au concept pour justifier la réponse,
ou confirme que la réponse s'y déduit. Pas d'introduction, pas de conclusion.`;

function decrireQuestion(variant: VariantFige, rang: number): string {
  const lignes = [
    `### Question ${rang + 1} (${variant.format})`,
    `Q. ${variant.question}`,
    `R. ${variant.answerKey}`,
  ];

  if (variant.options && variant.options.length > 0) {
    lignes.push("Options :");
    for (const option of variant.options) lignes.push(`- ${option}`);
  }

  return lignes.join("\n");
}

/**
 * Rend un verdict par question, dans l'ordre.
 *
 * Un concept sans question ne fait pas d'appel. Le juge ne voit que ce qu'il y
 * a à juger, et un rapport écrit « aucune question » ne demande pas de
 * dépenser un centime pour le confirmer.
 */
export async function jugerLaFidelite(
  concept: string,
  variants: VariantFige[],
): Promise<VerdictFidelite[]> {
  if (variants.length === 0) return [];

  const contenu = [
    "## Concept",
    "",
    concept,
    "",
    `## ${variants.length} question(s)`,
    "",
    variants.map(decrireQuestion).join("\n\n"),
  ].join("\n");

  const sortie = await callAI({
    contract: CONTRAT,
    system: SYSTEM,
    messages: [{ role: "user", content: [{ type: "text", text: contenu }] }],
    model: MODELE_DES_JUGES,
    maxTokens: TOKENS_DES_JUGES,
  });

  const parNumero = new Map(sortie.questions.map((v) => [v.numero, v]));

  return variants.map((_, rang) => {
    const verdict = parNumero.get(rang + 1);
    return verdict
      ? { juste: verdict.juste, motif: verdict.motif.trim() }
      : { juste: null, motif: "non rendu par le juge" };
  });
}
