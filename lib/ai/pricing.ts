/**
 * Tarifs en dollars par million de tokens, entrée et sortie séparées.
 *
 * Ce sont les tarifs catalogue. Sonnet 5 est en tarif d'introduction réduit
 * (2 $ / 10 $) jusqu'au 31 août 2026 : compter au tarif plein surestime la
 * dépense, ce qui est le bon sens de l'erreur pour un garde-fou de budget.
 */
export type ModelPricing = {
  inputPerMillion: number;
  outputPerMillion: number;
};

const PRICING: Record<string, ModelPricing> = {
  "claude-opus-5": { inputPerMillion: 5, outputPerMillion: 25 },
  "claude-sonnet-5": { inputPerMillion: 3, outputPerMillion: 15 },
  "claude-haiku-4-5": { inputPerMillion: 1, outputPerMillion: 5 },
};

/** Tarif retenu pour un modèle inconnu : le plus cher de la table. */
const FALLBACK: ModelPricing = { inputPerMillion: 5, outputPerMillion: 25 };

export function pricingFor(model: string): ModelPricing {
  return PRICING[model] ?? FALLBACK;
}

/**
 * Coût d'un appel, rendu en chaîne décimale à huit décimales : la colonne
 * `AiCall.costUsd` est un Decimal, on n'y fait pas passer un flottant.
 */
export function computeCostUsd(model: string, inputTokens: number, outputTokens: number): string {
  const { inputPerMillion, outputPerMillion } = pricingFor(model);
  const dollars = (inputTokens * inputPerMillion + outputTokens * outputPerMillion) / 1_000_000;

  return dollars.toFixed(8);
}
