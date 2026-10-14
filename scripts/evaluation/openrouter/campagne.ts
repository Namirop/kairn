import { TOKENS_DES_JUGES } from "../juges/modele";

/**
 * Les constantes de la campagne de comparaison des modèles, qui ne changent
 * plus une fois écrites. Campagne close : voir `docs/outillage.md`.
 */

/**
 * Le bandeau en tête de tout rapport de campagne : le biais de lignée du juge
 * et la borne haute des doublons. Ne pas paraphraser : c'est la phrase de
 * référence pour lire les chiffres.
 */
export const BANDEAU_DE_CAMPAGNE = `Juge : claude-haiku-4-5, même lignée (Anthropic) que la colonne de référence. Les comptes restent comparables entre colonnes, mais les écarts serrés entre Sonnet et un challenger sont à lire avec prudence. Les doublons confirmés restent une borne haute (biais définition/propriété dérivée documenté).`;

/**
 * Le budget de sortie par appel de campagne (extraction, génération, juges),
 * le même pour tous les modèles : celui qui a suffi à la référence au figé
 * `11h58`.
 *
 * Un modèle qui ne rend pas dans ce budget (qui épuise en reasoning avant la
 * sortie contrainte) est compté en échec de schéma, pas accommodé. Seul
 * `validation-du-juge/volets.ts` le dépasse, parce qu'il groupe les six paires témoins
 * en un appel.
 */
export const BUDGET_SORTIE_CAMPAGNE = TOKENS_DES_JUGES;
