/**
 * Ce qui est en train d'être oublié, classé par retard relatif à l'intervalle et
 * non en jours : un tri en jours ferait passer un arriéré de concepts solides
 * devant un concept fragile.
 */

const JOUR_MS = 24 * 60 * 60 * 1000;

export type ConceptAOublier = {
  id: string;
  lastReview: Date | null;
  /** L'intervalle que ts-fsrs avait prévu, en jours. */
  scheduledDays: number;
};

/**
 * En parts d'intervalle promis : 3 jours revu il y a 6 donne 2, 90 revu il y a
 * 93 donne 1,03. Jamais revu, l'infini : fragile par définition, et sans ratio.
 */
export function retardRelatif(concept: Omit<ConceptAOublier, "id">, maintenant: Date): number {
  if (!concept.lastReview) return Number.POSITIVE_INFINITY;

  // Nul pour une carte en apprentissage, replanifiée à quelques minutes.
  const intervalle = Math.max(concept.scheduledDays, 1);
  const ecoules = (maintenant.getTime() - concept.lastReview.getTime()) / JOUR_MS;

  return ecoules / intervalle;
}

/**
 * Pas de soustraction : `Infinity - Infinity` rend `NaN`, et un comparateur qui
 * rend `NaN` trie n'importe comment. L'identifiant départage.
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
