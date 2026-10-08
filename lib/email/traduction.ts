import { createTranslator } from "next-intl";
import type { Langue } from "@/lib/db/types";
import { LOCALE } from "@/lib/i18n/langues";
import { MESSAGES } from "@/lib/i18n/messages";

/**
 * Les textes d'un email, dans la langue de la personne qui le reçoit.
 *
 * Un email ne part pas d'une requête React : il n'y a ni `getTranslations` ni
 * langue de la requête. La langue vient du compte — ou, pour un code de
 * connexion demandé avant qu'il existe, de la requête qui l'a demandé — et
 * chaque gabarit la reçoit en paramètre.
 */
export function textesDEmail(langue: Langue) {
  return createTranslator({
    locale: LOCALE[langue],
    messages: MESSAGES[langue],
    namespace: "emails",
  });
}
