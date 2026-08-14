/**
 * Les concepts qui ne tiennent pas seuls, écartés avant tout le reste.
 *
 * Le passage du 14/08 a montré qu'une consigne anti-redondance en prose ne
 * prend pas : le prompt d'extraction a grossi de 70 %, et le témoin écrit
 * exactement pour l'éprouver — `15-redondance-interne` — est le seul dépôt du
 * corpus à être **monté**, de quatre concepts à cinq, en produisant deux
 * formulations de la même idée. Le test qui aurait dû les attraper était déjà
 * dans le prompt depuis le début.
 *
 * On cesse donc de demander au modèle de compter ou de s'auto-restreindre, et
 * on lui demande de **qualifier chaque élément** — ce qu'il fait très bien,
 * comme l'énumération des formats par facette le prouve. Il déclare la relation
 * concept par concept, le serveur décide de la coupe.
 *
 * L'ordre compte : cette coupe passe **avant** le plafond de vingt. Tronquer
 * d'abord garderait des exemples en écartant des concepts autoportants classés
 * plus bas.
 */

export type Derivable = { deriveDe?: number | null };

export type Derives<T> = {
  gardes: T[];
  /** Combien la relation a écartés. Part au rapport, jamais à l'écran. */
  ecartes: number;
};

/**
 * Un renvoi ne compte que s'il désigne un autre concept du même envoi.
 *
 * Les indices sont ceux annoncés au modèle, à partir de 1. Un renvoi à
 * soi-même, à zéro ou hors de la liste ne décrit aucune relation lisible : le
 * concept est gardé, parce qu'écarter sur une valeur qu'on ne sait pas
 * interpréter reviendrait à perdre du contenu sur un défaut de forme.
 */
function renvoieAUnAutre(concept: Derivable, rang: number, total: number): boolean {
  const cible = concept.deriveDe ?? null;

  if (cible === null || !Number.isInteger(cible)) return false;

  return cible >= 1 && cible <= total && cible !== rang + 1;
}

/**
 * Les concepts autoportants d'une extraction.
 *
 * **Un envoi n'est jamais vidé par ce chemin.** Si tous les concepts se
 * déclarent dérivés — un cycle, ou un modèle qui a mal compris la consigne —,
 * on les garde tous : un dépôt entier perdu sur une relation mal décrite serait
 * exactement le défaut que le plafond de douze avait déjà produit. Le banc, lui,
 * le dira.
 */
export function ecarterLesDerives<T extends Derivable>(concepts: readonly T[]): Derives<T> {
  const gardes = concepts.filter(
    (concept, rang) => !renvoieAUnAutre(concept, rang, concepts.length),
  );

  if (gardes.length === 0) return { gardes: [...concepts], ecartes: 0 };

  return { gardes, ecartes: concepts.length - gardes.length };
}
