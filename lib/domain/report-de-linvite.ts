/**
 * Quand reproposer l'installation à quelqu'un qui l'a écartée.
 *
 * Une invite se ferme aussi par réflexe, avant d'avoir été lue : le premier
 * refus la met en sommeil une semaine, le second l'éteint pour de bon.
 */

export type RefusDInstallation = {
  /** Combien de fois l'invite a été écartée sur cet appareil. */
  compte: number;
  /** Le dernier de ces refus. */
  dernier: Date;
};

/**
 * Après deux refus, on ne repropose plus. Le compte est celui des refus, pas
 * celui des propositions : la première invite n'a pas de refus derrière elle.
 */
export const REFUS_AVANT_SILENCE = 2;

/**
 * La durée du sommeil, en jours. Une semaine suffit : c'est le plafond de
 * refus qui protège de l'insistance, en bornant à trois propositions.
 */
export const SOMMEIL_JOURS = 7;

const MS_PAR_JOUR = 24 * 60 * 60 * 1000;

/**
 * L'invite doit-elle se taire ?
 *
 * Le sommeil est une durée absolue, pas des jours de calendrier : un changement
 * d'heure ne déplace pas la frontière. Un refus daté du futur (horloge remise
 * en arrière) endort l'invite : mieux vaut se taire à tort que reproposer en
 * boucle.
 */
export function inviteEnSommeil(refus: RefusDInstallation | null, maintenant: Date): boolean {
  if (!refus) return false;
  if (refus.compte >= REFUS_AVANT_SILENCE) return true;

  const ecoule = maintenant.getTime() - refus.dernier.getTime();

  return ecoule < SOMMEIL_JOURS * MS_PAR_JOUR;
}
