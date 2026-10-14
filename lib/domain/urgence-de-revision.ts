/**
 * Ce qui est en train d'être oublié, classé par retard relatif à l'intervalle
 * et non en jours : trois jours ne pèsent pas pareil sur un intervalle de trois
 * jours et sur un de trois mois, et un tri en jours ferait passer un arriéré de
 * concepts solides devant un concept fragile.
 */

const JOUR_MS = 24 * 60 * 60 * 1000;

/** Le strict nécessaire pour juger de l'urgence d'un concept. */
export type ConceptAOublier = {
  id: string;
  /** Dernier passage, quel qu'en ait été le résultat. */
  lastReview: Date | null;
  /** L'intervalle que ts-fsrs avait prévu, en jours. */
  scheduledDays: number;
};

/**
 * Le temps écoulé depuis le dernier passage, en parts d'intervalle promis.
 *
 * Intervalle de 3 jours revu il y a 6 : 2. Intervalle de 90 revu il y a 93 :
 * 1,03. Le premier passe devant.
 *
 * Un concept jamais revu vaut l'infini : jamais retrouvé, il est fragile par
 * définition, et aucun intervalle promis ne permet de ratio.
 */
export function retardRelatif(concept: Omit<ConceptAOublier, "id">, maintenant: Date): number {
  if (!concept.lastReview) return Number.POSITIVE_INFINITY;

  // Un intervalle nul vient d'une carte en apprentissage, replanifiée à
  // quelques minutes : le plancher d'un jour évite la division par zéro.
  const intervalle = Math.max(concept.scheduledDays, 1);
  const ecoules = (maintenant.getTime() - concept.lastReview.getTime()) / JOUR_MS;

  return ecoules / intervalle;
}

/**
 * L'ordre de service : le plus en train d'être oublié d'abord.
 *
 * L'identifiant départage, y compris entre deux concepts jamais revus. La
 * comparaison n'est pas une soustraction : `Infinity - Infinity` rend `NaN`,
 * et un comparateur qui rend `NaN` trie n'importe comment.
 */
export function parUrgence<T extends ConceptAOublier>(
  maintenant: Date,
): (une: T, deux: T) => number {
  return (une, deux) => {
    const urgenceUne = retardRelatif(une, maintenant);
    const urgenceDeux = retardRelatif(deux, maintenant);

    if (urgenceUne !== urgenceDeux) return urgenceDeux > urgenceUne ? 1 : -1;

    return une.id.localeCompare(deux.id);
  };
}
