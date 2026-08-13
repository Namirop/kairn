import { tarifCatalogue, type Tarif } from "@/lib/domain/tarifs";

/**
 * Ce qu'un appel coûte, au **tarif catalogue**.
 *
 * Les tarifs eux-mêmes vivent dans `lib/domain/tarifs.ts`, avec les remises
 * d'introduction qui les accompagnent : deux tables de prix dans deux fichiers
 * finiraient par diverger, et c'est le genre d'écart qui ne se voit pas avant
 * qu'on compare une facture à un tableau de bord.
 *
 * On écrit le catalogue plutôt que le tarif réellement facturé parce que
 * surestimer est le bon sens de l'erreur pour un garde-fou de budget. Le
 * tableau de bord d'administration, lui, montre les deux côte à côte.
 */
export type ModelPricing = Tarif;

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
  return tarifCatalogue(model);
}

/**
 * Coût d'un appel, rendu en chaîne décimale à huit décimales : la colonne
 * `AiCall.costUsd` est un Decimal, on n'y fait pas passer un flottant.
 *
 * `inputTokens` ne compte que l'entrée non mise en cache — l'API sépare les
 * trois. Les additionner au même tarif ferait mentir le chiffre.
 */
export function computeCostUsd(model: string, consommation: Consommation): string {
  const { entreePerMillion, sortiePerMillion } = pricingFor(model);
  const entree =
    consommation.inputTokens +
    (consommation.cacheCreationTokens ?? 0) * ECRITURE_CACHE +
    (consommation.cacheReadTokens ?? 0) * LECTURE_CACHE;
  const remise = consommation.groupe ? REMISE_GROUPEE : 1;
  const dollars =
    ((entree * entreePerMillion + consommation.outputTokens * sortiePerMillion) * remise) / 1e6;

  return dollars.toFixed(8);
}
