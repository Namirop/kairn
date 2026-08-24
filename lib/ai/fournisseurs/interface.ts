import type { AiMessage } from "../message";
import type { OutputSchema } from "../output-schema";

/**
 * L'interface commune aux fournisseurs de modèle. Deux implémentations : la
 * lignée Anthropic (chemin historique du produit), et OpenRouter (portée du
 * banc, avec les réglages campagne pour ne pas se retrouver avec les 404 de
 * Mistral ou les schémas refusés d'OpenAI).
 *
 * L'interface ne connaît ni retry, ni cache, ni plafond : tout ça vit dans
 * `client.ts`. Un pont est un émetteur, il ne décide de rien.
 */

export type Fournisseur = "anthropic" | "openrouter";

/**
 * Ce qu'un pont rend en sortie d'un appel réussi. `responseText` est la
 * réponse brute (JSON string) que `lireSortieStructuree` va valider — chaque
 * pont extrait ce texte à sa façon (Anthropic : bloc `text` de la Message,
 * OpenRouter : `choices[0].message.content`), l'appelant n'a pas à savoir.
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
   * Ce que le fournisseur donne comme raison d'arrêt. `stop` = ok,
   * `length` = tronqué (le client lève `AITruncatedOutputError`), le reste
   * est traité comme un échec du bloc de texte.
   */
  finishReason: "stop" | "length" | "other";
};

export type EmissionParams = {
  /** Le modèle à appeler (identifiant natif du fournisseur, tel quel). */
  model: string;
  maxTokens: number;
  system: string;
  messages: AiMessage[];
  /** Wrapper `{ type, schema }` dérivé de `toOutputSchema(contract.forme)`. Anthropic le passe tel quel à `output_config.format` ; OpenRouter extrait `.schema` pour son `response_format`. */
  formatSchema: OutputSchema;
  /** L'intention (`contract.purpose`) — sert de nom au `response_format`. */
  purpose: string;
};

export type PontFournisseur = {
  readonly nom: Fournisseur;
  emettre(params: EmissionParams): Promise<EmissionResult>;
};
