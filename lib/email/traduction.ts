import { createTranslator } from "next-intl";
import type { Langue } from "@/lib/db/types";
import { LOCALE } from "@/lib/i18n/langues";
import { MESSAGES } from "@/lib/i18n/messages";

/**
 * Les textes d'un email, dans la langue de qui le reçoit. Hors d'une requête
 * React, pas de `getTranslations` : chaque gabarit reçoit la langue en
 * paramètre.
 */
export function textesDEmail(langue: Langue) {
  return createTranslator({
    locale: LOCALE[langue],
    messages: MESSAGES[langue],
    namespace: "emails",
  });
}
