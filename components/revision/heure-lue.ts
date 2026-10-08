import type { Langue } from "@/lib/db/types";
import { ETIQUETTE_INTL } from "@/lib/i18n/langues";

/**
 * L'heure du rappel, écrite comme la langue l'écrit : « 19 h » ici, « 7 PM »
 * ailleurs.
 *
 * L'heure arrive seule, déjà dans le calendrier de la personne. Elle est posée
 * sur un jour quelconque en UTC et lue en UTC : aucun fuseau ne s'y ajoute, et
 * seul compte le format.
 */
export function heureLue(heure: number, langue: Langue): string {
  return new Intl.DateTimeFormat(ETIQUETTE_INTL[langue], {
    hour: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(2000, 0, 1, heure)));
}
