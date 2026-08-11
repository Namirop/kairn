/**
 * L'état de maîtrise d'un concept.
 *
 * Une machine à états dérivée de données qu'on possède déjà : l'intervalle que
 * ts-fsrs vient de rendre, et la suite de notes du concept. Aucun appel modèle,
 * aucun calcul coûteux — un champ mis à jour à chaque passage.
 *
 * L'état ne pilote rien : c'est la carte ts-fsrs qui décide quand un concept
 * revient. Il ne sert qu'à dire où en est la personne.
 */

/** Bornes en jours, telles qu'annoncées à l'utilisateur. */
export const JOURS_AVANT_REVIEWING = 7;
export const JOURS_AVANT_CONSOLIDATION = 21;
/**
 * Trois mois. Au-delà, le concept sort du cycle de lui-même.
 *
 * Six mois laissaient l'oubli faire son travail deux fois plutôt qu'une, et
 * surtout c'était une promesse qu'on n'ose pas afficher : « on te le repose
 * dans six mois » s'entend comme « on te le rend jamais ». Trois mois suffisent
 * à ce qu'oublier ait le temps de se produire, et ça se dit devant quelqu'un.
 */
export const JOURS_AVANT_ARCHIVAGE = 90;

/** Ce qu'il faut de réussites d'affilée pour consolider un concept espacé. */
export const REUSSITES_POUR_CONSOLIDER = 3;

export type EtatMaitrise = "LEARNING" | "REVIEWING" | "CONSOLIDATED" | "ARCHIVED";

/** Notes de ts-fsrs, dans le vocabulaire de la base. */
export type Note = "AGAIN" | "HARD" | "GOOD" | "EASY";

/**
 * `AGAIN` seul vaut échec.
 *
 * `HARD` dit que la réponse est venue difficilement, pas qu'elle était fausse :
 * la compter comme un échec rendrait la consolidation presque inatteignable
 * pour quelqu'un d'honnête avec lui-même.
 */
export function estReussite(note: Note): boolean {
  return note !== "AGAIN";
}

/** Réussites d'affilée en partant du passage le plus récent. */
export function compterReussitesConsecutives(notes: readonly Note[]): number {
  let compte = 0;

  for (let rang = notes.length - 1; rang >= 0; rang -= 1) {
    const note = notes[rang];

    if (!note || !estReussite(note)) break;

    compte += 1;
  }

  return compte;
}

/**
 * L'état après un passage.
 *
 * L'archivage passe en premier : une déclaration de l'utilisateur ou un
 * intervalle au-delà de trois mois sortent le concept du cycle, quel que soit le
 * reste. Un concept espacé mais pas encore régulier reste en `REVIEWING` — la
 * consolidation demande les deux, la durée **et** la régularité.
 */
export function etatApresRevision(
  intervalleJours: number,
  reussitesConsecutives: number,
  archiveParUtilisateur: boolean,
): EtatMaitrise {
  if (archiveParUtilisateur) return "ARCHIVED";
  if (intervalleJours > JOURS_AVANT_ARCHIVAGE) return "ARCHIVED";

  if (intervalleJours > JOURS_AVANT_CONSOLIDATION) {
    return reussitesConsecutives >= REUSSITES_POUR_CONSOLIDER ? "CONSOLIDATED" : "REVIEWING";
  }

  if (intervalleJours >= JOURS_AVANT_REVIEWING) return "REVIEWING";

  return "LEARNING";
}
