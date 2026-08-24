import { pontAnthropic } from "./anthropic";
import { pontOpenRouter } from "./openrouter";
import type { Fournisseur, PontFournisseur } from "./interface";

/**
 * Le résolveur de pont. Un seul appelant : `client.ts`. La lignée choisie
 * dépend de la configuration (`AI_FOURNISSEUR`), la clé dépend de la lignée
 * — deux comptes séparés côté hébergeur, pas un compte qui sert deux
 * routes.
 */

export type ClesFournisseur = {
  anthropicApiKey: string | undefined;
  openrouterApiKey: string | undefined;
};

export function choisirFournisseur(nom: Fournisseur, cles: ClesFournisseur): PontFournisseur {
  switch (nom) {
    case "anthropic":
      return pontAnthropic(cles.anthropicApiKey);
    case "openrouter":
      return pontOpenRouter(cles.openrouterApiKey);
  }
}

export { sdkFor } from "./anthropic";
export type { EmissionParams, EmissionResult, Fournisseur, PontFournisseur } from "./interface";
