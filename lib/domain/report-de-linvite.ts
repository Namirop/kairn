/**
 * Quand reproposer l'installation à qui l'a écartée. Une invite se ferme aussi
 * par réflexe : le premier refus l'endort, le second l'éteint.
 */

export type RefusDInstallation = {
  /** Combien de fois l'invite a été écartée sur cet appareil. */
  compte: number;
  /** Le dernier de ces refus. */
  dernier: Date;
};

/** Un compte de refus, pas de propositions : la première invite n'en a pas derrière elle. */
export const REFUS_AVANT_SILENCE = 2;

/** Une semaine suffit : c'est le plafond de refus qui protège de l'insistance. */
export const SOMMEIL_JOURS = 7;

const MS_PAR_JOUR = 24 * 60 * 60 * 1000;

/**
 * Une durée absolue, pas des jours de calendrier : un changement d'heure ne
 * déplace rien. Un refus daté du futur endort l'invite : mieux vaut se taire à
 * tort que reproposer en boucle.
 */
export function inviteEnSommeil(refus: RefusDInstallation | null, maintenant: Date): boolean {
  if (!refus) return false;
  if (refus.compte >= REFUS_AVANT_SILENCE) return true;

  const ecoule = maintenant.getTime() - refus.dernier.getTime();

  return ecoule < SOMMEIL_JOURS * MS_PAR_JOUR;
}
