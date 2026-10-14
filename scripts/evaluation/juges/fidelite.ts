import { z } from "zod";
import { callAI } from "@/lib/ai/client";
import type { AiContract } from "@/lib/ai/schemas";
import type { VariantFige } from "../fige";
import { MODELE_DES_JUGES, MOTIF_MAXIMUM, TOKENS_DES_JUGES } from "./modele";

/**
 * Le juge de fidélité : un concept et ses questions, **jamais le dépôt** — ni
 * concepts voisins, ni tags. Il doit savoir ce que saura la personne qui
 * révise. Avec le texte sous les yeux, tout se justifie : une réponse-étalon
 * absente du concept (`banane`, sur `08`) se complète mentalement et passe.
 *
 * La réponse-étalon est jugée au même titre que la question : un `answerKey`
 * qui s'appuie sur des raisons absentes du concept est une violation.
 *
 * Un appel par concept, ses questions groupées.
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

export const CONTRAT_FIDELITE: AiContract<z.infer<typeof fideliteValidation>> = {
  purpose: "juge_fidelite",
  forme: fideliteForme,
  validation: fideliteValidation,
};

export const SYSTEM_FIDELITE = `Tu vérifies qu'une question se répond avec un concept — et ce
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

export function decrireQuestion(variant: VariantFige, rang: number): string {
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

/** Rend un verdict par question, dans l'ordre. Un concept sans question ne fait pas d'appel. */
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
    contract: CONTRAT_FIDELITE,
    system: SYSTEM_FIDELITE,
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
