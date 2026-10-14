import { after } from "next/server";

/**
 * Faire quelque chose après avoir rendu la main, pour qu'une alerte ne ralentisse
 * ni ne fasse échouer ce qu'elle surveille.
 *
 * Une promesse simplement lâchée meurt en silence chez un hébergeur sans
 * serveur, qui endort la fonction dès la réponse rendue : `after()` la tient
 * éveillée. Hors d'une portée de requête (script, test), `after()` lève, et la
 * promesse lâchée suffit puisqu'aucune réponse n'est attendue.
 */
export function differer(travail: () => Promise<void>): void {
  try {
    after(travail);
  } catch {
    void travail();
  }
}
