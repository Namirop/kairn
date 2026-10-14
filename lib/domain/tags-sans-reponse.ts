import { motsNormalises } from "./mots-normalises";

/**
 * Les étiquettes d'un concept, moins celles qui donnent la réponse
 * (`EFFET-MAGNUS` au-dessus d'un QCM dont « Effet Magnus » est la bonne option).
 *
 * Retirées à l'affichage seulement : le concept les garde pour le classement et
 * l'alternance des sujets. En cas de doute on retire ; une étiquette de trop
 * montrée coûte la question, une de trop retirée ne coûte rien.
 *
 * Les deux côtés passent par `motsNormalises` : `EFFET-MAGNUS` et « effet
 * Magnus » s'y rejoignent.
 */

/**
 * Sous cette longueur, une étiquette (« js », « ui ») se retrouve partout par
 * hasard sans rien trahir.
 */
const LONGUEUR_MINIMALE = 4;

export function tagsSansReponse(tags: string[], reponses: (string | null | undefined)[]): string[] {
  const dit = motsNormalises(reponses.filter((texte): texte is string => Boolean(texte)).join(" "));

  return tags.filter((tag) => {
    const cherche = motsNormalises(tag);

    if (cherche.trim().length < LONGUEUR_MINIMALE) return true;

    return !dit.includes(cherche);
  });
}
