/**
 * Les modèles du banc, avec leur identifiant OpenRouter et leur prix catalogue
 * en dollars par million de tokens.
 *
 * Ne compare pas les factures brutes entre colonnes, seulement les prix
 * catalogue : le cache de prompt ne traverse pas les fournisseurs, et la
 * colonne Sonnet tournait à 92 % de lecture au cache quand les challengers
 * paient leur entrée plein tarif.
 *
 * `verifierLeListing()` (`verification.ts`) refuse au démarrage un
 * identifiant disparu ou sans sorties structurées. Les identifiants sont
 * épinglés : un alias `/latest` bouge sans préavis.
 */

export type ModeleOpenRouter = {
  /** Nom court utilisé dans les rapports et les logs. */
  nom: string;
  /** Identifiant OpenRouter, `<fournisseur>/<slug>`. */
  id: string;
  /** Dollars par million de tokens d'entrée, prix catalogue. */
  prixInParM: number;
  /** Dollars par million de tokens de sortie, prix catalogue. */
  prixOutParM: number;
  /** La lignée du modèle, sert à empêcher un juge de sa propre famille. */
  lignee:
    | "anthropic"
    | "google"
    | "openai"
    | "mistral"
    | "deepseek"
    | "qwen"
    | "minimax"
    | "zai"
    | "moonshot";
};

/**
 * La colonne de référence, celle du figé `11h58`. Son prix est celui
 * d'OpenRouter et non de l'API Anthropic : les challengers passent aussi par
 * OpenRouter, et c'est ce prix que la règle des −33 % compare.
 */
export const REFERENCE: ModeleOpenRouter = {
  nom: "Sonnet 5",
  id: "anthropic/claude-sonnet-5",
  prixInParM: 2,
  prixOutParM: 10,
  lignee: "anthropic",
};

/**
 * Les challengers de la campagne 1 : quatre lignées, quatre paliers de prix,
 * tous capables de passer la règle des −33 % face à la référence.
 */
export const CHALLENGERS: ModeleOpenRouter[] = [
  {
    nom: "DeepSeek V4 Pro",
    id: "deepseek/deepseek-v4-pro",
    prixInParM: 0.53,
    prixOutParM: 1.05,
    lignee: "deepseek",
  },
  {
    nom: "Gemini 3.7 Flash",
    id: "google/gemini-3.7-flash",
    prixInParM: 0.38,
    prixOutParM: 1.88,
    lignee: "google",
  },
  {
    nom: "Mistral Large 2512",
    id: "mistralai/mistral-large-2512",
    prixInParM: 0.5,
    prixOutParM: 1.5,
    lignee: "mistral",
  },
  {
    nom: "GPT-5.6 Luna",
    id: "openai/gpt-5.6-luna",
    prixInParM: 0.2,
    prixOutParM: 1.2,
    lignee: "openai",
  },
];

/**
 * Le juge : Haiku, le modèle des verdicts du figé `11h58`, pour que la
 * colonne de référence reste valable sans être rejugée. L'identifiant
 * OpenRouter porte un point (`claude-haiku-4.5`), l'Anthropic natif des
 * tirets (`claude-haiku-4-5`).
 */
export const JUGE_PRINCIPAL: ModeleOpenRouter = {
  nom: "Claude Haiku 4.5",
  id: "anthropic/claude-haiku-4.5",
  prixInParM: 1,
  prixOutParM: 5,
  lignee: "anthropic",
};

/**
 * Les juges candidats écartés, gardés pour que `valider-le-juge.ts
 * --candidat=<id>` puisse les cibler et que la vérification du listing tienne
 * leurs identifiants à jour. Ne pas en refaire un juge sans repasser la
 * validation du juge.
 */
/** Libère les jumeaux (paire 15) et la règle-plus-instance (paire 16). */
export const QWEN_36_FLASH_ECARTE: ModeleOpenRouter = {
  nom: "Qwen 3.6 Flash",
  id: "qwen/qwen3.6-flash",
  prixInParM: 0.19,
  prixOutParM: 1.13,
  lignee: "qwen",
};
/** Libère les jumeaux, comme le flash. */
export const QWEN_36_PLUS_ECARTE: ModeleOpenRouter = {
  nom: "Qwen 3.6 Plus",
  id: "qwen/qwen3.6-plus",
  prixInParM: 0.33,
  prixOutParM: 1.95,
  lignee: "qwen",
};
/** Tronque en reasoning avant de rendre, même en `effort: "low"`. */
export const GLM_5_ECARTE: ModeleOpenRouter = {
  nom: "GLM 5",
  id: "z-ai/glm-5",
  prixInParM: 0.6,
  prixOutParM: 1.92,
  lignee: "zai",
};
/** Tronque en reasoning, comme GLM 5. */
export const GLM_47_FLASH_ECARTE: ModeleOpenRouter = {
  nom: "GLM 4.7 Flash",
  id: "z-ai/glm-4.7-flash",
  prixInParM: 0.06,
  prixOutParM: 0.4,
  lignee: "zai",
};
/** Fusionne définition et propriété dérivée (3/6 au doublon, jumeaux tenus). */
export const KIMI_K2_0905_ECARTE: ModeleOpenRouter = {
  nom: "Kimi K2-0905",
  id: "moonshotai/kimi-k2-0905",
  prixInParM: 0.6,
  prixOutParM: 2.5,
  lignee: "moonshot",
};

export const JUGES_ECARTES: ModeleOpenRouter[] = [
  QWEN_36_FLASH_ECARTE,
  QWEN_36_PLUS_ECARTE,
  GLM_5_ECARTE,
  GLM_47_FLASH_ECARTE,
  KIMI_K2_0905_ECARTE,
];

export const JUGES_CANDIDATS: ModeleOpenRouter[] = [JUGE_PRINCIPAL, ...JUGES_ECARTES];
