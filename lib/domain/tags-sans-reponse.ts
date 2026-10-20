import { motsNormalises } from "./mots-normalises";

/**
 * Les étiquettes d'un concept, moins celles qui donnent la réponse. À
 * l'affichage seulement : le concept les garde pour le classement. En cas de
 * doute on retire ; une étiquette de trop montrée coûte la question.
 */

/** En deçà, une étiquette (« js », « ui ») se retrouve partout sans rien trahir. */
const LONGUEUR_MINIMALE = 4;

export function tagsSansReponse(tags: string[], reponses: (string | null | undefined)[]): string[] {
  const dit = motsNormalises(reponses.filter((texte): texte is string => Boolean(texte)).join(" "));

  return tags.filter((tag) => {
    const cherche = motsNormalises(tag);

    if (cherche.trim().length < LONGUEUR_MINIMALE) return true;

    return !dit.includes(cherche);
  });
}
