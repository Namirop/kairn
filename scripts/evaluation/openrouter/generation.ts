import { SYSTEM_PROMPTS } from "@/lib/ai/prompts";
import { contratDeGeneration, type GenerateVariantsOutput } from "@/lib/ai/schemas";
import { emplacementDuTexteATrou } from "@/lib/domain/emplacement-du-trou";
import { messageDuGroupe } from "@/lib/domain/envoi-de-questions";
import { appelerViaOpenRouter, type ConsommationOpenRouter } from "./client";
import type { Facture } from "./juges";
import type { ModeleOpenRouter } from "./modeles";

/**
 * La génération de questions via OpenRouter pour la campagne 2 : même prompt et
 * même envoi que la référence, sinon on ne compare plus le même travail.
 * L'emplacement du trou est semé sur le premier concept du groupe, comme dans
 * `lib/jobs/redaction-questions.ts`.
 *
 * `reasoning: false` par défaut : la génération n'en a pas besoin, et le
 * paramètre déclenche un 404 chez certains fournisseurs (Mistral).
 */

export type GroupeAGenerer = {
  /** La graine du tirage — texte du concept au banc, id de l'Atom en production. */
  graine: string;
  /** Le texte du concept qui sera présenté au modèle. */
  concept: string;
};

function facturer(modele: ModeleOpenRouter, consommation: ConsommationOpenRouter): Facture {
  const coutUsd =
    (consommation.inputTokens * modele.prixInParM +
      consommation.outputTokens * modele.prixOutParM) /
    1_000_000;
  return {
    inputTokens: consommation.inputTokens,
    outputTokens: consommation.outputTokens,
    coutUsd,
    latencyMs: consommation.latencyMs,
  };
}

export async function genererVia(
  modele: ModeleOpenRouter,
  groupe: GroupeAGenerer[],
  maxTokens: number,
  reasoning: { effort: "low" | "medium" | "high" } | false = false,
): Promise<{ sortie: GenerateVariantsOutput; facture: Facture }> {
  const trou = emplacementDuTexteATrou(groupe[0]?.concept ?? "");
  const contract = contratDeGeneration(trou);
  const contenu = messageDuGroupe(groupe);

  const { valeur, consommation } = await appelerViaOpenRouter({
    contract,
    system: SYSTEM_PROMPTS.generate_variants,
    messages: [{ role: "user", content: contenu }],
    model: modele.id,
    maxTokens,
    reasoning,
  });

  return { sortie: valeur, facture: facturer(modele, consommation) };
}
