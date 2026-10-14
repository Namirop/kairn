import type { ConsommationOpenRouter } from "./client";
import type { ModeleOpenRouter } from "./modeles";

export type Facture = {
  inputTokens: number;
  outputTokens: number;
  coutUsd: number;
  latencyMs: number;
};

/**
 * Le coût au prix catalogue épinglé, pas `consommation.costUsd` : OpenRouter
 * ne le rend que pour une partie des modèles, et la règle de coût du banc se
 * lit sur les prix épinglés, pas sur une ristourne du fournisseur.
 */
export function facturer(modele: ModeleOpenRouter, consommation: ConsommationOpenRouter): Facture {
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
