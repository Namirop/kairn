import { tarifCatalogue, type Tarif } from "@/lib/domain/tarifs";

/**
 * Au tarif catalogue plutôt que facturé : pour un garde-fou de budget, surestimer
 * est le bon sens de l'erreur. L'administration montre les deux.
 */
export type TarifDuModele = Tarif;

/**
 * Le cache se facture selon le modèle, pas le fournisseur : Sonnet via OpenRouter
 * reste au barème Anthropic. Tout ce qui n'est pas OpenAI tombe sur Anthropic, qui
 * surestime. OpenAI ne facture pas l'écriture (cache automatique).
 */
type LigneeCache = "anthropic" | "openai";

const MULTIPLICATEURS_CACHE: Record<LigneeCache, { ecriture: number; lecture: number }> = {
  anthropic: { ecriture: 1.25, lecture: 0.1 },
  openai: { ecriture: 0, lecture: 0.5 },
};

function ligneeDuCache(modele: string): LigneeCache {
  if (modele.startsWith("openai/") || modele.startsWith("gpt-")) return "openai";
  return "anthropic";
}

export type Consommation = {
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens?: number;
  cacheReadTokens?: number;
};

export function tarifDuModele(modele: string): TarifDuModele {
  return tarifCatalogue(modele);
}

/**
 * En chaîne : `AiCall.costUsd` est un Decimal, on n'y fait pas passer un flottant.
 * `inputTokens` ne compte que l'entrée hors cache, l'API séparant les trois postes.
 */
export function coutEnDollars(modele: string, consommation: Consommation): string {
  const { entreePerMillion, sortiePerMillion } = tarifDuModele(modele);
  const multiplicateurs = MULTIPLICATEURS_CACHE[ligneeDuCache(modele)];
  const entree =
    consommation.inputTokens +
    (consommation.cacheCreationTokens ?? 0) * multiplicateurs.ecriture +
    (consommation.cacheReadTokens ?? 0) * multiplicateurs.lecture;
  const dollars = (entree * entreePerMillion + consommation.outputTokens * sortiePerMillion) / 1e6;

  return dollars.toFixed(8);
}
