import { createTranslator } from "next-intl";
import type { TraduireLesRefus } from "@/lib/depots/bornes-du-depot";
import type { Langue } from "@/lib/db/types";
import { LOCALE } from "@/lib/i18n/langues";
import { MESSAGES } from "@/lib/i18n/messages";

/**
 * Les refus du dépôt, dans une langue donnée.
 *
 * Les fonctions de `lib/depots/` reçoivent leur traducteur en paramètre : une
 * action le prend de la requête avec `getTranslations("depots.refus")`, un
 * script ou un test n'a pas de requête et passe par ici. Le français par défaut
 * garde les scripts de vérification tels qu'ils sont écrits — ils lisent les
 * refus dans la langue de référence.
 */
export function textesDesRefus(langue: Langue = "FR"): TraduireLesRefus {
  return createTranslator({
    locale: LOCALE[langue],
    messages: MESSAGES[langue],
    namespace: "depots.refus",
  });
}
