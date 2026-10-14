import { tarifCatalogue, type Tarif } from "@/lib/domain/tarifs";

/**
 * Ce qu'un appel coûte, au tarif catalogue (tables dans `lib/domain/tarifs.ts`)
 * plutôt qu'au tarif facturé : pour un garde-fou de budget, surestimer est le
 * bon sens de l'erreur. L'administration montre les deux.
 */
export type ModelPricing = Tarif;

/**
 * Les multiplicateurs de cache dépendent du modèle, pas du fournisseur : Sonnet
 * via OpenRouter reste facturé comme Anthropic. Le préfixe du modèle dit qui
 * facture (`gpt-` / `openai/` → OpenAI, tout le reste → Anthropic, qui
 * surestime).
 *
 * Anthropic : écriture 1,25×, lecture 0,1×. OpenAI : écriture non facturée
 * (cache automatique), lecture 0,5×.
 */
type LigneeCache = "anthropic" | "openai";

const MULTIPLICATEURS_CACHE: Record<LigneeCache, { ecriture: number; lecture: number }> = {
  anthropic: { ecriture: 1.25, lecture: 0.1 },
  openai: { ecriture: 0, lecture: 0.5 },
};

function ligneeDuCache(model: string): LigneeCache {
  if (model.startsWith("openai/") || model.startsWith("gpt-")) return "openai";
  return "anthropic";
}

/** Ce qu'un appel a consommé. Les tokens de cache sont comptés à part. */
export type Consommation = {
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens?: number;
  cacheReadTokens?: number;
};

export function pricingFor(model: string): ModelPricing {
  return tarifCatalogue(model);
}

/**
 * Coût d'un appel en chaîne à huit décimales : `AiCall.costUsd` est un Decimal,
 * on n'y fait pas passer un flottant.
 *
 * `inputTokens` ne compte que l'entrée hors cache : l'API sépare les trois
 * postes, chacun a son tarif.
 */
export function computeCostUsd(model: string, consommation: Consommation): string {
  const { entreePerMillion, sortiePerMillion } = pricingFor(model);
  const multiplicateurs = MULTIPLICATEURS_CACHE[ligneeDuCache(model)];
  const entree =
    consommation.inputTokens +
    (consommation.cacheCreationTokens ?? 0) * multiplicateurs.ecriture +
    (consommation.cacheReadTokens ?? 0) * multiplicateurs.lecture;
  const dollars = (entree * entreePerMillion + consommation.outputTokens * sortiePerMillion) / 1e6;

  return dollars.toFixed(8);
}
