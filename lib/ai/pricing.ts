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

/**
 * Écrire dans le cache coûte un quart de plus qu'une entrée normale, y lire
 * coûte un dixième. Ces deux multiplicateurs ne dépendent pas du modèle.
 */
const ECRITURE_CACHE = 1.25;
const LECTURE_CACHE = 0.1;

/** Un envoi groupé est facturé moitié prix, entrée comme sortie. */
const REMISE_GROUPEE = 0.5;

/** Ce qu'un appel a consommé. Les tokens de cache sont comptés à part. */
export type Consommation = {
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens?: number;
  cacheReadTokens?: number;
  /** Vrai si la requête est partie dans un envoi groupé. */
  groupe?: boolean;
};

export function pricingFor(model: string): ModelPricing {
  return PRICING[model] ?? FALLBACK;
}

/**
 * Coût d'un appel, rendu en chaîne décimale à huit décimales : la colonne
 * `AiCall.costUsd` est un Decimal, on n'y fait pas passer un flottant.
 *
 * `inputTokens` ne compte que l'entrée non mise en cache — l'API sépare les
 * trois. Les additionner au même tarif ferait mentir le chiffre.
 */
export function computeCostUsd(model: string, consommation: Consommation): string {
  const { inputPerMillion, outputPerMillion } = pricingFor(model);
  const entree =
    consommation.inputTokens +
    (consommation.cacheCreationTokens ?? 0) * ECRITURE_CACHE +
    (consommation.cacheReadTokens ?? 0) * LECTURE_CACHE;
  const remise = consommation.groupe ? REMISE_GROUPEE : 1;
  const dollars =
    ((entree * inputPerMillion + consommation.outputTokens * outputPerMillion) * remise) / 1e6;

  return dollars.toFixed(8);
}
