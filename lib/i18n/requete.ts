import { getRequestConfig } from "next-intl/server";
import { langueDeLaRequete } from "./langue-de-la-requete";
import { LOCALE } from "./langues";
import { MESSAGES } from "./messages";

/**
 * Ce que next-intl sait de la requête : sa langue et ses textes.
 *
 * Pas de fuseau : chaque écran passe celui de la personne là où il formate, et
 * un défaut ferait afficher une heure fausse à qui l'oublierait.
 */
export default getRequestConfig(async () => {
  const langue = await langueDeLaRequete();

  return { locale: LOCALE[langue], messages: MESSAGES[langue] };
});
