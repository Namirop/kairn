import type { Facture } from "../openrouter/facture";

/** Le cumul d'une étape de colonne, que le garde-fou 2× compare à son estimation. */
export type FactureCumulee = { in: number; out: number; usd: number; appels: number };

export function ajouter(a: Facture, b: FactureCumulee): void {
  b.in += a.inputTokens;
  b.out += a.outputTokens;
  b.usd += a.coutUsd;
  b.appels += 1;
}
