import { after } from "next/server";

/**
 * Pour qu'une alerte ne ralentisse ni ne fasse échouer ce qu'elle surveille. En
 * serverless, une promesse lâchée meurt avec la réponse : `after()` la tient
 * éveillée. Hors requête (script, test), il lève, et la promesse lâchée suffit.
 */
export function differer(travail: () => Promise<void>): void {
  try {
    after(travail);
  } catch {
    void travail();
  }
}
