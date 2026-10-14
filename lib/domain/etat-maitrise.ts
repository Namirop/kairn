/**
 * L'état de maîtrise d'un concept, dérivé de l'intervalle rendu par ts-fsrs et
 * de la suite de notes.
 *
 * L'état ne pilote rien : c'est la carte ts-fsrs qui décide quand un concept
 * revient. Il dit seulement où en est la personne.
 */

/** Bornes en jours, telles qu'annoncées à l'utilisateur. */
export const JOURS_AVANT_REVIEWING = 7;
export const JOURS_AVANT_CONSOLIDATION = 21;
/**
 * L'échéance que pose « je maîtrise ça ». Trois mois laissent à l'oubli le temps
 * de se produire tout en restant une promesse qu'on peut afficher ; six
 * s'entendaient comme « jamais ».
 *
 * Ce n'est pas un seuil d'archivage automatique : `ARCHIVED` ne veut dire qu'une
 * chose, l'utilisateur l'a demandé.
 */
export const JOURS_AVANT_ARCHIVAGE = 90;

/** Ce qu'il faut de réussites d'affilée pour consolider un concept espacé. */
export const REUSSITES_POUR_CONSOLIDER = 3;

export type EtatMaitrise = "LEARNING" | "REVIEWING" | "CONSOLIDATED" | "ARCHIVED";

/**
 * Les états qui valent une pierre au cairn. `ARCHIVED` en fait partie : déclarer
 * « je maîtrise ça » ne doit pas retirer la pierre.
 *
 * Défini ici pour que le compteur et les graines du dessin voient le même
 * ensemble, sans quoi la hauteur du cairn et le nombre annoncé divergent.
 */
export const ETATS_QUI_POSENT_UNE_PIERRE: EtatMaitrise[] = ["CONSOLIDATED", "ARCHIVED"];

/** Notes de ts-fsrs, dans le vocabulaire de la base. */
export type Note = "AGAIN" | "HARD" | "GOOD" | "EASY";

/**
 * `AGAIN` seul vaut échec. `HARD` dit que la réponse est venue difficilement :
 * le compter comme échec rendrait la consolidation presque inatteignable pour
 * qui se note honnêtement.
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
 * `ARCHIVED` ne se pose que sur déclaration de l'utilisateur : aucun intervalle,
 * si long soit-il, ne sort un concept du cycle. La consolidation demande la
 * durée et la régularité ; espacé sans régularité, un concept reste en
 * `REVIEWING`.
 */
export function etatApresRevision(
  intervalleJours: number,
  reussitesConsecutives: number,
  archiveParUtilisateur: boolean,
): EtatMaitrise {
  if (archiveParUtilisateur) return "ARCHIVED";

  if (intervalleJours > JOURS_AVANT_CONSOLIDATION) {
    return reussitesConsecutives >= REUSSITES_POUR_CONSOLIDER ? "CONSOLIDATED" : "REVIEWING";
  }

  if (intervalleJours >= JOURS_AVANT_REVIEWING) return "REVIEWING";

  return "LEARNING";
}
