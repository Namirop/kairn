/**
 * Les étiquettes d'un concept, moins celles qui donnent la réponse
 * (`EFFET-MAGNUS` au-dessus d'un QCM dont « Effet Magnus » est la bonne option).
 *
 * Retirées à l'affichage seulement : le concept les garde pour le classement et
 * l'alternance des sujets. En cas de doute on retire ; une étiquette de trop
 * montrée coûte la question, une de trop retirée ne coûte rien.
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
 * Sous cette longueur, une étiquette (« js », « ui ») se retrouve partout par
 * hasard sans rien trahir.
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
