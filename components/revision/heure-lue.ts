import type { Langue } from "@/lib/db/types";
import { ETIQUETTE_INTL } from "@/lib/i18n/langues";

/**
 * L'heure du rappel au format de la langue (« 19 h », « 7 PM »). Elle est déjà
 * dans le fuseau de la personne : posée et lue en UTC, elle ne bouge pas.
 */
export function heureLue(heure: number, langue: Langue): string {
  return new Intl.DateTimeFormat(ETIQUETTE_INTL[langue], {
    hour: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(2000, 0, 1, heure)));
}
