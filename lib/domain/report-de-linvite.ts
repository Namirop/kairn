/**
 * Quand reproposer l'installation à quelqu'un qui l'a écartée.
 *
 * Le refus était définitif sur l'appareil, au motif qu'une invite qui revient à
 * chaque visite n'est plus une proposition. Le motif reste juste, la règle
 * l'était moins : une invite se ferme aussi par réflexe, avant d'avoir été lue,
 * et une croix cliquée en trois dixièmes de seconde décidait pour toujours.
 *
 * D'où un report, et un compteur qui l'arrête. Le premier refus met l'invite en
 * sommeil une semaine ; le second l'éteint pour de bon. Deux refus, c'est une
 * réponse — au troisième, insister ne dit plus rien de nouveau et devient du
 * harcèlement poli.
 *
 * L'instant est passé en paramètre, comme partout ici : la fonction est pure et
 * ne demande jamais l'heure elle-même.
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
 * La durée du sommeil, en jours.
 *
 * Une semaine, et non un mois. Le plafond de deux refus est ce qui protège de
 * l'insistance — il borne à trois propositions, quoi qu'il arrive. Une fois cette
 * borne posée, espacer davantage ne protège plus personne : ça ne fait que
 * laisser passer des semaines où quelqu'un aurait installé l'application s'il
 * avait su qu'il pouvait.
 */
export const SOMMEIL_JOURS = 7;

const MS_PAR_JOUR = 24 * 60 * 60 * 1000;

/**
 * L'invite doit-elle se taire ?
 *
 * Le sommeil se mesure en durée absolue et non en jours de calendrier. C'est
 * volontaire : un passage à l'heure d'hiver déplacerait la frontière d'une heure
 * si on comparait des dates locales, et personne ne saurait dire de quel côté
 * elle est tombée. Un mois d'attente n'a pas à être un mois à la minute près, il
 * a à être le même mois pour tout le monde.
 *
 * Un refus daté du futur — horloge de l'appareil remise en arrière, stockage
 * recopié — endort l'invite plutôt que de la réveiller. C'est le sens le moins
 * nuisible des deux : on préfère se taire à tort que reproposer en boucle à
 * quelqu'un qui vient de refuser.
 */
export function inviteEnSommeil(refus: RefusDInstallation | null, maintenant: Date): boolean {
  if (!refus) return false;
  if (refus.compte >= REFUS_AVANT_SILENCE) return true;

  const ecoule = maintenant.getTime() - refus.dernier.getTime();

  return ecoule < SOMMEIL_JOURS * MS_PAR_JOUR;
}
