import { appelerViaOpenRouter, type ConsommationOpenRouter } from "./client";
import type { ModeleOpenRouter } from "./modeles";
import type { Facture } from "./juges";
import { EXTRACT_ATOMS, type ExtractAtomsOutput } from "@/lib/ai/schemas";
import { SYSTEM_PROMPTS } from "@/lib/ai/prompts";

/**
 * L'extraction servie via OpenRouter — un appel `EXTRACT_ATOMS` sur le texte
 * d'un dépôt, avec le même prompt système que la production. Réservé au banc
 * de la campagne 1, où les quatre challengers doivent tourner sur le même
 * prompt que Sonnet — sinon on ne compare plus le même travail.
 *
 * Le budget de sortie est celui de la campagne (`BUDGET_SORTIE_CAMPAGNE`).
 * Un modèle qui déborde échoue au `finish_reason: "length"`, compté comme
 * échec de schéma et rangé au verdict du dépôt.
 *
 * Défaut `reasoning: false` — l'extraction n'est pas une tâche reasoning, et
 * certains fournisseurs (Mistral en tête, relevé campagne 1 du 2026-08-24)
 * renvoient 404 « No endpoints found that can handle the requested parameters »
 * si le paramètre est présent avec `provider.require_parameters: true`. Les
 * modèles non reasoning ne perdent rien à le retirer.
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
