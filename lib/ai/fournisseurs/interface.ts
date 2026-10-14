import type { AiMessage } from "../message";
import type { OutputSchema } from "../output-schema";

/**
 * L'interface commune aux fournisseurs de modèle (Anthropic, OpenRouter). Un
 * pont est un émetteur : plafonds, repli et registre vivent dans `client.ts`.
 */

export type Fournisseur = "anthropic" | "openrouter";

/**
 * Ce qu'un pont rend d'un appel réussi. `responseText` est le JSON brut que
 * `lireSortieStructuree` validera, extrait par chaque pont à sa façon.
 */
export type EmissionResult = {
  responseText: string;
  consommation: {
    inputTokens: number;
    outputTokens: number;
    cacheCreationTokens: number;
    cacheReadTokens: number;
  };
  latencyMs: number;
  /** Le modèle effectivement servi — OpenRouter peut re-router chez un fournisseur alternatif. */
  modeleServi: string;
  /**
   * La raison d'arrêt. `length` = tronqué, et le client lève
   * `AITruncatedOutputError` ; `other` n'est pas un échec en soi, la sortie
   * passe à la validation comme pour `stop`.
   */
  finishReason: "stop" | "length" | "other";
};

export type EmissionParams = {
  /** Le modèle à appeler (identifiant natif du fournisseur, tel quel). */
  model: string;
  maxTokens: number;
  system: string;
  messages: AiMessage[];
  /** Dérivé de `toOutputSchema(contract.forme)`. Anthropic le passe tel quel ; OpenRouter n'en prend que `.schema`. */
  formatSchema: OutputSchema;
  /** L'intention (`contract.purpose`) — sert de nom au `response_format`. */
  purpose: string;
};

export type PontFournisseur = {
  readonly nom: Fournisseur;
  emettre(params: EmissionParams): Promise<EmissionResult>;
};
