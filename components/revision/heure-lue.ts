import type { Langue } from "@/lib/db/types";
import { ETIQUETTE_INTL } from "@/lib/i18n/langues";

/**
 * L'heure du rappel, écrite comme la langue l'écrit : « 19 h » ici, « 7 PM »
 * ailleurs.
 *
 * L'heure est déjà dans le fuseau de la personne : posée et lue en UTC sur un
 * jour quelconque, elle ne subit aucun décalage, seul compte le format.
 */
export function heureLue(heure: number, langue: Langue): string {
  return new Intl.DateTimeFormat(ETIQUETTE_INTL[langue], {
    hour: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(2000, 0, 1, heure)));
}
