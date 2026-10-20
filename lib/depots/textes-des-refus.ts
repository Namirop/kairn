import { createTranslator } from "next-intl";
import type { TraduireLesRefus } from "@/lib/depots/bornes-du-depot";
import type { Langue } from "@/lib/db/types";
import { LOCALE } from "@/lib/i18n/langues";
import { MESSAGES } from "@/lib/i18n/messages";

/** Pour ce qui n'a pas de requête ; une action prend `getTranslations("depots.refus")`. */
export function textesDesRefus(langue: Langue = "FR"): TraduireLesRefus {
  return createTranslator({
    locale: LOCALE[langue],
    messages: MESSAGES[langue],
    namespace: "depots.refus",
  });
}
