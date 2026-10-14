import { pontAnthropic } from "./anthropic";
import { pontOpenRouter } from "./openrouter";
import type { Fournisseur, PontFournisseur } from "./interface";

/**
 * Le résolveur de pont, appelé par `client.ts` seul. La lignée vient de
 * `AI_FOURNISSEUR`, et chacune a sa propre clé.
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

export type { EmissionParams, EmissionResult, Fournisseur, PontFournisseur } from "./interface";
