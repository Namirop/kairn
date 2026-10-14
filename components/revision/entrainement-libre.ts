import type { Messages } from "@/lib/i18n/messages";

/**
 * Ce que l'entraînement fait — le planning ne bouge pas —, dit une seule fois
 * pour toutes les portes qui y mènent. La phrase nomme le bouton dont elle
 * parle, pour se rattacher seule sous une paire d'actions.
 */
export const ENTRAINEMENT_LIBRE =
  "entrainementLibre" satisfies keyof Messages["revision"]["paliers"];
