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
 * Les multiplicateurs de cache **dépendent du modèle**, pas du pont.
 *
 * Anthropic — écriture au cache un quart plus cher qu'une entrée normale,
 * lecture au dixième. C'est le tarif public.
 *
 * OpenAI — cache automatique de préfixe, **pas d'écriture facturée** (le
 * fournisseur cache tout seul), lecture à moitié prix. Les multiplicateurs
 * Anthropic appliqués à un modèle OpenAI feraient croire à une facture
 * qu'on ne paie pas.
 *
 * La lignée se lit sur le préfixe du modèle : `claude-` / `anthropic/*` →
 * Anthropic ; `gpt-` / `openai/*` → OpenAI. Ce n'est pas le pont qui
 * décide — un jour on pourrait router Sonnet via OpenRouter (le pont
 * changerait), le cache resterait la lignée Anthropic. Le pont dit
 * *où* l'appel part, le préfixe dit *qui facture*.
 *
 * Défaut prudent en `anthropic` pour un modèle non préfixé : ça surestime
 * plutôt que sous-estimer, cohérent avec le principe du registre.
 *
 * Voir la fiche `portage-luna.md`, §3.
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
 *
 * La lignée de cache se déduit du préfixe du modèle (voir `ligneeDuCache`) —
 * pas du pont. Anthropic facture l'écriture 1,25× et la lecture 0,1× ;
 * OpenAI ne facture pas l'écriture et lit à 0,5×.
 */
export function computeCostUsd(model: string, consommation: Consommation): string {
  const { entreePerMillion, sortiePerMillion } = pricingFor(model);
  const multiplicateurs = MULTIPLICATEURS_CACHE[ligneeDuCache(model)];
  const entree =
    consommation.inputTokens +
    (consommation.cacheCreationTokens ?? 0) * multiplicateurs.ecriture +
    (consommation.cacheReadTokens ?? 0) * multiplicateurs.lecture;
  const remise = consommation.groupe ? REMISE_GROUPEE : 1;
  const dollars =
    ((entree * entreePerMillion + consommation.outputTokens * sortiePerMillion) * remise) / 1e6;

  return dollars.toFixed(8);
}
