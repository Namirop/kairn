import { TOKENS_DES_JUGES } from "../juges/modele";

/**
 * Les constantes de la campagne — bandeau du rapport, budget de sortie, et
 * autres règles qui ne changent plus une fois écrites. À importer par le
 * script de campagne quand il sera écrit ; posé ici tout de suite pour que
 * la fiche `campagne-modeles.md` ait un ancrage exécutable.
 */

/**
 * Le bandeau à recopier tel quel en tête de tout rapport de campagne. Il
 * documente le biais de lignée du juge (Haiku côté Anthropic, même que la
 * référence) et rappelle la borne haute des doublons.
 *
 * **Ne pas paraphraser** — c'est la phrase votée à l'arrêt 1, elle sert de
 * référence pour toute lecture ultérieure des chiffres.
 */
export const BANDEAU_DE_CAMPAGNE = `Juge : claude-haiku-4-5, même lignée (Anthropic) que la colonne de référence. Les comptes restent comparables entre colonnes, mais les écarts serrés entre Sonnet et un challenger sont à lire avec prudence. Les doublons confirmés restent une borne haute (biais définition/propriété dérivée documenté).`;

/**
 * Le budget de sortie par appel juge, **règle de campagne appliquée à tous
 * les challengers**. C'est celui qui a suffi à Sonnet au figé `11h58`, on
 * s'y tient à l'identique pour tout le monde.
 *
 * Un modèle qui ne rend pas dans ce budget — le cas de GLM-5 à l'arrêt 1,
 * qui épuisait en reasoning avant la sortie contrainte — est **disqualifié
 * et compté comme échec de schéma**, pas accommodé par un plafond plus haut.
 * Même barre pour tout le monde, y compris quand le modèle est bon par
 * ailleurs.
 *
 * Le paramètre `maxTokens` reste optionnel dans `openrouter/juges.ts`
 * uniquement pour permettre au script `valider-le-juge.ts` d'utiliser un
 * plafond gonflé (les 6 paires témoins sont soumises en un seul appel,
 * l'arrêt 1 n'est pas la campagne). Aucune autre exception ne se justifie.
 */
export const BUDGET_SORTIE_CAMPAGNE = TOKENS_DES_JUGES;
