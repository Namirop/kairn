import { getRequestConfig } from "next-intl/server";
import { langueDeLaRequete } from "./langue-de-la-requete";
import { LOCALE } from "./langues";
import { MESSAGES } from "./messages";

/**
 * Ce que next-intl sait de la requête : sa langue et ses textes.
 *
 * Pas de fuseau ici. Les dates s'affichent dans celui de la personne, qui vit
 * dans ses réglages et que chaque écran passe déjà là où il formate ; en poser
 * un par défaut ferait afficher une heure fausse à quiconque l'oublierait.
 */
export default getRequestConfig(async () => {
  const langue = await langueDeLaRequete();

  return { locale: LOCALE[langue], messages: MESSAGES[langue] };
});
