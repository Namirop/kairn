import { appelerViaOpenRouter } from "./client";
import type { ModeleOpenRouter } from "./modeles";
import { facturer, type Facture } from "./facture";
import { CONTRAT_D_EXTRACTION, type SortieDExtraction } from "@/lib/ai/schemas";
import { PROMPTS_SYSTEME_FR } from "@/lib/ai/prompts";

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

export async function extraireVia(
  modele: ModeleOpenRouter,
  texte: string,
  maxTokens: number,
  reasoning: { effort: "low" | "medium" | "high" } | false = false,
): Promise<{ sortie: SortieDExtraction; facture: Facture }> {
  const { valeur, consommation } = await appelerViaOpenRouter({
    contract: CONTRAT_D_EXTRACTION,
    system: PROMPTS_SYSTEME_FR.extract_atoms,
    messages: [{ role: "user", content: texte }],
    model: modele.id,
    maxTokens,
    reasoning,
  });
  return { sortie: valeur, facture: facturer(modele, consommation) };
}
