import { appelerViaOpenRouter, type ConsommationOpenRouter } from "./client";
import type { ModeleOpenRouter } from "./modeles";
import type { Facture } from "./juges";
import { EXTRACT_ATOMS, type ExtractAtomsOutput } from "@/lib/ai/schemas";
import { SYSTEM_PROMPTS } from "@/lib/ai/prompts";

/**
 * L'extraction via OpenRouter pour le banc, avec le prompt système de la
 * production : sans lui, les challengers ne feraient pas le même travail que
 * Sonnet. Un modèle qui dépasse le budget de sortie échoue sur
 * `finish_reason: "length"`, compté comme échec de schéma.
 *
 * `reasoning: false` par défaut : certains fournisseurs (Mistral) renvoient
 * 404 « No endpoints found » quand le paramètre est présent avec
 * `provider.require_parameters: true`, et l'extraction n'en a pas besoin.
 */

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

export async function extraireVia(
  modele: ModeleOpenRouter,
  texte: string,
  maxTokens: number,
  reasoning: { effort: "low" | "medium" | "high" } | false = false,
): Promise<{ sortie: ExtractAtomsOutput; facture: Facture }> {
  const { valeur, consommation } = await appelerViaOpenRouter({
    contract: EXTRACT_ATOMS,
    system: SYSTEM_PROMPTS.extract_atoms,
    messages: [{ role: "user", content: texte }],
    model: modele.id,
    maxTokens,
    reasoning,
  });
  return { sortie: valeur, facture: facturer(modele, consommation) };
}
