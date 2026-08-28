/**
 * Les étiquettes d'un concept, moins celles qui donnent la réponse.
 *
 * **Le cas vu en session :** `TENNIS · EFFET-MAGNUS` au-dessus d'un QCM dont les
 * quatre options étaient « Effet Coriolis », « Effet Venturi », « Effet Doppler »,
 * « Effet Magnus ». La bonne réponse était écrite en petites capitales à trois
 * centimètres au-dessus. La question ne mesurait plus rien.
 *
 * Ce n'est pas un accident de génération : les étiquettes nomment le sujet du
 * concept, et une question de reconnaissance demande précisément comment on
 * nomme ce sujet. Les deux font leur travail — c'est de les afficher ensemble
 * qui est fautif.
 *
 * On retire donc, à l'affichage seulement, l'étiquette qui se lit dans la
 * réponse. Le concept la garde : elle sert au classement, à l'alternance des
 * sujets dans une session, et aux trois autres facettes où elle ne trahit rien.
 *
 * **Une étiquette de trop retirée ne coûte rien, une étiquette de trop montrée
 * coûte la question.** En cas de doute on retire : c'est un repère de classement
 * qui disparaît, pas une information dont la réponse dépend — la question, elle,
 * se lit seule.
 */

/** Minuscules, sans accents, sans ponctuation : `EFFET-MAGNUS` et « effet Magnus ». */
function aplati(texte: string): string {
  return ` ${texte
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()} `;
}

/**
 * Sous cette longueur, une étiquette se retrouve partout par hasard.
 *
 * « js », « ui », « bd » apparaissent dans n'importe quelle réponse un peu
 * longue sans rien y trahir. On ne retire que ce qui est assez spécifique pour
 * que sa présence dans la réponse veuille dire quelque chose.
 */
const LONGUEUR_MINIMALE = 4;

export function tagsSansReponse(tags: string[], reponses: (string | null | undefined)[]): string[] {
  const dit = aplati(reponses.filter((texte): texte is string => Boolean(texte)).join(" "));

  return tags.filter((tag) => {
    const cherche = aplati(tag);

    if (cherche.trim().length < LONGUEUR_MINIMALE) return true;

    return !dit.includes(cherche);
  });
}
