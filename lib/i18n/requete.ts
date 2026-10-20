import { getRequestConfig } from "next-intl/server";
import { langueDeLaRequete } from "./langue-de-la-requete";
import { LOCALE } from "./langues";
import { MESSAGES } from "./messages";

/**
 * Pas de fuseau par défaut : chaque écran passe celui de la personne, et un
 * défaut afficherait une heure fausse à qui l'oublierait.
 */
export default getRequestConfig(async () => {
  const langue = await langueDeLaRequete();

  return { locale: LOCALE[langue], messages: MESSAGES[langue] };
});
