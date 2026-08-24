/**
 * Les modèles de la campagne, avec leur identifiant OpenRouter et leur prix
 * catalogue. Un seul endroit à corriger si l'identifiant change ou si un
 * nouveau modèle entre dans la liste — le reste du banc lit ces constantes.
 *
 * Prix en dollars par million de tokens, catalogue OpenRouter. Le cache de
 * prompt ne traverse pas les fournisseurs (voir §1 de la fiche) : les
 * challengers paient leur entrée plein tarif, la colonne Sonnet 5 (déjà
 * payée) tournait à 92 % de lecture au cache. Ne pas comparer les factures
 * brutes entre colonnes, seulement les prix catalogue.
 *
 * Les identifiants sont ceux du listing OpenRouter au moment de la fiche.
 * `verifierLeListing()` de `verification.ts` refuse au démarrage si l'un
 * d'eux n'existe plus ou ne supporte pas les sorties structurées.
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
 * La colonne de référence, déjà payée par la confirmation du figé
 * 2026-08-20-11h58. Le prix ci-dessous est celui d'OpenRouter, pas de l'API
 * Anthropic directe : c'est le prix qui s'applique aux comparaisons de la
 * campagne, puisque les challengers passent aussi par OpenRouter. La fiche
 * `campagne-modeles.md` annonçait 3/15 (l'ancien tarif Anthropic natif) — le
 * listing dit 2/10 le 21 août, et c'est cette borne qui est appliquée à la
 * règle §5.
 *
 * Identifiant épinglé (pas d'alias en `/latest` — ils bougent sans préavis).
 */
export const REFERENCE: ModeleOpenRouter = {
  nom: "Sonnet 5",
  id: "anthropic/claude-sonnet-5",
  prixInParM: 2,
  prixOutParM: 10,
  lignee: "anthropic",
};

/**
 * Les quatre challengers de la campagne 1, désignés dans
 * `designation-challengers.md` sur le catalogue OpenRouter du 21 août.
 * Quatre lignées, quatre paliers de prix ; chacun peut satisfaire la règle
 * du §5 (−33 % au moins face à la référence 2/10). Identifiants épinglés.
 */
export const CHALLENGERS: ModeleOpenRouter[] = [
  {
    nom: "DeepSeek V4 Pro",
    id: "deepseek/deepseek-v4-pro",
    // Prix descendu au listing OpenRouter avant l'émission de la campagne 1
    // (relevé le 2026-08-24, ancien tarif 1.6/3.2 dans la fiche). Le
    // challenger devient plus favorable, la marge du §5 s'élargit — rien à
    // rejouer côté arrêt 1, le juge Haiku restait au même prix.
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
 * Le juge de la campagne — décision de l'arrêt 1, 2026-08-21 : Haiku via
 * OpenRouter, même modèle et mêmes prompts que les verdicts du figé `11h58`
 * (la colonne de référence reste valable sans re-jugement). Identifiant
 * OpenRouter avec un point (`claude-haiku-4.5`), l'identifiant Anthropic
 * natif est en tirets (`claude-haiku-4-5`) — ne pas confondre.
 */
export const JUGE_PRINCIPAL: ModeleOpenRouter = {
  nom: "Claude Haiku 4.5",
  id: "anthropic/claude-haiku-4.5",
  prixInParM: 1,
  prixOutParM: 5,
  lignee: "anthropic",
};

/**
 * Les candidats OpenRouter essayés à l'arrêt 1 puis écartés. Conservés en
 * constantes pour deux raisons : la vérification du listing garde leurs
 * identifiants et prix à jour (utile si on retente), et le script
 * `valider-le-juge.ts --candidat=<id>` peut les cibler sans qu'on invente à
 * chaque fois. Ne pas les remettre en juge sans avoir repassé l'arrêt 1.
 */
/** Écarté à l'arrêt 1 : libère les jumeaux (paire 15) et la règle-plus-instance (paire 16). */
export const QWEN_36_FLASH_ECARTE: ModeleOpenRouter = {
  nom: "Qwen 3.6 Flash",
  id: "qwen/qwen3.6-flash",
  prixInParM: 0.19,
  prixOutParM: 1.13,
  lignee: "qwen",
};
/** Écarté à l'arrêt 1 : libère les jumeaux, même défaut que le flash. */
export const QWEN_36_PLUS_ECARTE: ModeleOpenRouter = {
  nom: "Qwen 3.6 Plus",
  id: "qwen/qwen3.6-plus",
  prixInParM: 0.33,
  prixOutParM: 1.95,
  lignee: "qwen",
};
/** Écarté à l'arrêt 1 : tronque en reasoning avant de rendre, même en `effort: "low"`. */
export const GLM_5_ECARTE: ModeleOpenRouter = {
  nom: "GLM 5",
  id: "z-ai/glm-5",
  prixInParM: 0.6,
  prixOutParM: 1.92,
  lignee: "zai",
};
/** Écarté à l'arrêt 1 : tronque en reasoning, même défaut que GLM 5. */
export const GLM_47_FLASH_ECARTE: ModeleOpenRouter = {
  nom: "GLM 4.7 Flash",
  id: "z-ai/glm-4.7-flash",
  prixInParM: 0.06,
  prixOutParM: 0.4,
  lignee: "zai",
};
/** Écarté à l'arrêt 1 : fusionne définition et propriété dérivée (3/6 au doublon, jumeaux tenus). */
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
