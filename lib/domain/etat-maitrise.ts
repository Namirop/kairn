/**
 * L'état de maîtrise d'un concept. Il ne pilote rien : c'est la carte ts-fsrs
 * qui décide quand un concept revient, l'état dit où en est la personne.
 */

/** Bornes en jours, telles qu'annoncées à l'utilisateur. */
export const JOURS_AVANT_REVIEWING = 7;
export const JOURS_AVANT_CONSOLIDATION = 21;
/**
 * L'échéance que pose « je maîtrise ça » : assez loin pour laisser l'oubli se
 * produire, assez près pour ne pas s'entendre « jamais ». Pas un seuil
 * d'archivage automatique : `ARCHIVED` veut dire que l'utilisateur l'a demandé.
 */
export const JOURS_AVANT_ARCHIVAGE = 90;

/** Ce qu'il faut de réussites d'affilée pour consolider un concept espacé. */
export const REUSSITES_POUR_CONSOLIDER = 3;

export type EtatMaitrise = "LEARNING" | "REVIEWING" | "CONSOLIDATED" | "ARCHIVED";

/**
 * Déclarer « je maîtrise ça » ne retire pas la pierre. Partagé par le compteur
 * et le dessin, sans quoi la hauteur du cairn et le nombre annoncé divergent.
 */
export const ETATS_QUI_POSENT_UNE_PIERRE: EtatMaitrise[] = ["CONSOLIDATED", "ARCHIVED"];

/** Notes de ts-fsrs, dans le vocabulaire de la base. */
export type Note = "AGAIN" | "HARD" | "GOOD" | "EASY";

/**
 * Compter `HARD` comme échec rendrait la consolidation presque inatteignable
 * pour qui se note honnêtement.
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
 * Aucun intervalle, si long soit-il, ne sort un concept du cycle. La
 * consolidation demande durée et régularité : espacé sans régularité, il reste
 * en `REVIEWING`.
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
