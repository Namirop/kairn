import { SYSTEM_PROMPTS } from "@/lib/ai/prompts";
import { contratDeGeneration, type GenerateVariantsOutput } from "@/lib/ai/schemas";
import { emplacementDuTexteATrou } from "@/lib/domain/emplacement-du-trou";
import { messageDuGroupe } from "@/lib/domain/envoi-de-questions";
import { appelerViaOpenRouter, type ConsommationOpenRouter } from "./client";
import type { Facture } from "./juges";
import type { ModeleOpenRouter } from "./modeles";

/**
 * La génération de questions servie via OpenRouter — un appel par groupe de
 * concepts (jusqu'à `CONCEPTS_PAR_APPEL`), avec le même prompt que Sonnet.
 * Réservé à la campagne 2, où les deux finalistes doivent tourner sur le même
 * envoi que la référence — sinon on ne compare plus le même travail.
 *
 * Le contract de génération est dynamique : l'emplacement du texte à trou est
 * décidé par le premier concept du groupe (règle du produit dans
 * `evaluation/execution.ts` du banc, alignée sur `lib/jobs/redaction-questions`).
 *
 * Défaut `reasoning: false` — génération n'est pas une tâche de raisonnement,
 * et le paramètre déclenche 404 chez certains fournisseurs (Mistral au moins,
 * relevé campagne 1). Aucun des finalistes de la campagne 2 n'est un modèle
 * reasoning.
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
