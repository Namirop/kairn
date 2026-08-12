/**
 * Ce qui est en train d'être oublié.
 *
 * La session servait le plus en retard d'abord, en jours. Sous un arriéré
 * important c'est un défaut : cent concepts solides en retard de trois jours
 * passent devant un concept fragile déposé la veille, et l'application cesse de
 * servir à ce qu'on vient d'apprendre. Le retard absolu ne dit rien tout seul —
 * trois jours ne pèsent pas pareil sur un intervalle de trois jours et sur un
 * intervalle de trois mois.
 *
 * Ce module ne connaît ni les échéances ni les sujets : il ne sait que classer
 * des concepts par ce qu'ils risquent.
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
 * Un concept d'intervalle 3 jours revu il y a 6 rend 2 : deux fois ce qu'il
 * pouvait tenir. Un concept d'intervalle 90 jours revu il y a 93 rend 1,03 : il
 * ne risque rien. Le premier passe devant, même s'il est arrivé plus tard.
 *
 * **Un concept jamais revu passe avant tout le reste.** Il n'est pas « en
 * retard » : il n'a simplement jamais été retrouvé une seule fois, ce qui est la
 * définition même de fragile. Aucun intervalle ne lui a été promis, donc aucun
 * ratio ne le décrit — l'infini est la valeur juste, pas un cas limite qu'on
 * range.
 */
export function retardRelatif(concept: Omit<ConceptAOublier, "id">, maintenant: Date): number {
  if (!concept.lastReview) return Number.POSITIVE_INFINITY;

  // Un intervalle nul vient d'une carte encore en apprentissage, replanifiée à
  // quelques minutes. Le plancher d'un jour lui donne l'unité de tout le reste
  // sans lui inventer une promesse qu'elle n'a pas reçue.
  const intervalle = Math.max(concept.scheduledDays, 1);
  const ecoules = (maintenant.getTime() - concept.lastReview.getTime()) / JOUR_MS;

  return ecoules / intervalle;
}

/**
 * L'ordre de service : le plus en train d'être oublié d'abord.
 *
 * L'identifiant départage, et il le fait aussi entre deux infinis — deux
 * concepts jamais revus portent la même urgence, et sans lui leur ordre
 * dépendrait de celui de la requête. La comparaison est explicite plutôt que
 * soustractive : `Infinity - Infinity` rend `NaN`, et un comparateur qui rend
 * `NaN` trie n'importe comment.
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
