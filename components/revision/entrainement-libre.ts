import type { Messages } from "@/lib/i18n/messages";

/**
 * Ce que l'entraînement fait, dit une fois pour toutes les portes qui y mènent.
 *
 * Trois écrans le proposent — la journée faite, la session finie, le tour
 * d'entraînement épuisé — et chacun l'annonçait avec ses propres mots. Trois
 * formulations d'une même promesse, c'est trois occasions d'en écrire une
 * fausse ; et celle-ci porte l'engagement qui distingue l'entraînement de la
 * session, qui est que le planning ne bouge pas.
 */
/**
 * Elle **nomme le bouton** dont elle parle. Posée sous une paire d'actions, une
 * précision qui commence par « D'autres questions… » ne dit pas à laquelle des
 * deux elle se rapporte ; celle-ci se rattache toute seule, et peut donc vivre
 * sous l'ensemble plutôt que collée à un seul bouton.
 */
export const ENTRAINEMENT_LIBRE =
  "entrainementLibre" satisfies keyof Messages["revision"]["paliers"];
