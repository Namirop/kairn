import type { MessageIa } from "../message";
import type { SchemaDeSortie } from "../schema-de-sortie";

/** Un pont ne fait qu'émettre : plafonds, repli et registre vivent dans `client.ts`. */

export type Fournisseur = "anthropic" | "openrouter";

/** `responseText` : le JSON brut, extrait par chaque pont à sa façon, validé ensuite. */
export type ResultatDEmission = {
  responseText: string;
  consommation: {
    inputTokens: number;
    outputTokens: number;
    cacheCreationTokens: number;
    cacheReadTokens: number;
  };
  latencyMs: number;
  /** OpenRouter peut re-router chez un autre fournisseur. */
  modeleServi: string;
  /** `length` = tronqué ; `other` n'est pas un échec, la sortie passe à la validation. */
  finishReason: "stop" | "length" | "other";
};

export type ParametresDEmission = {
  /** Identifiant natif du fournisseur, tel quel. */
  model: string;
  maxTokens: number;
  system: string;
  messages: MessageIa[];
  /** Anthropic le passe tel quel ; OpenRouter n'en prend que `.schema`. */
  formatSchema: SchemaDeSortie;
  /** Sert de nom au `response_format`. */
  purpose: string;
};

export type PontFournisseur = {
  readonly nom: Fournisseur;
  emettre(params: ParametresDEmission): Promise<ResultatDEmission>;
};
