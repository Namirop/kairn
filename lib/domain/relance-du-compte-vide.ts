import { joursEntre, localDay, localHour } from "./local-day";

/**
 * Quand relancer un compte qui n'a jamais rien déposé.
 *
 * C'est le troisième moment d'écriture, et le seul qui s'adresse à quelqu'un
 * dont le produit ne sait rien. Le rappel quotidien et l'alerte de série
 * supposent tous deux quelque chose d'échu ; un compte vide n'a rien d'échu, et
 * sortait donc du produit sans qu'aucun message ne le rattrape.
 *
 * Fonction pure : le passage horaire lui donne l'instant et ce qu'il a lu en
 * base, elle répond oui ou non. Aucun accès données, aucune horloge système.
 */

/**
 * Trois jours, et pas sept.
 *
 * Au bout d'une semaine, le contexte dans lequel quelqu'un s'est inscrit est
 * mort : l'article lu, la conversation, la raison. À trois jours il s'en
 * souvient encore, et la relance a quelque chose à quoi se raccrocher.
 */
export const JOURS_AVANT_RELANCE = 3;

/**
 * Au-delà, on renonce.
 *
 * Écrire à quelqu'un qui a ouvert un compte il y a six mois et n'y est jamais
 * revenu, ce n'est plus une relance, c'est du démarchage. La borne existe aussi
 * pour que la mise en service ne réveille pas d'un coup des comptes abandonnés
 * depuis longtemps.
 */
export const JOURS_APRES_LESQUELS_ON_RENONCE = 30;

export type CompteARelancer = {
  timezone: string;
  /** L'heure à laquelle ce compte a dit accepter d'être dérangé. */
  dailyReminderHour: number;
  inscritLe: Date;
};

/**
 * Est-ce l'heure de relancer ce compte-là ?
 *
 * Trois conditions : il est l'heure chez lui, son inscription date d'au moins
 * `JOURS_AVANT_RELANCE` jours civils, et de moins de
 * `JOURS_APRES_LESQUELS_ON_RENONCE`.
 *
 * **Une fenêtre, et non un jour exact.** Un jour exact perdrait la relance pour
 * de bon si le passage horaire sautait son tour — une panne d'une heure, un
 * déploiement. La fenêtre laisse le lendemain rattraper. Ce qui garantit qu'elle
 * ne part qu'une fois, ce n'est donc pas cette fonction : c'est `EmailDelivery`,
 * consulté sur le type et non sur le jour. Cette distinction est le seul endroit
 * où ce module ne se suffit pas à lui-même, et elle est volontaire.
 *
 * Le jour se compte en étiquettes `AAAA-MM-JJ` et non en multiples de vingt-quatre
 * heures : une journée locale fait 23 ou 25 heures aux changements d'heure, et
 * quelqu'un inscrit à 23 h 50 ne doit pas être relancé un jour plus tard que son
 * voisin inscrit à 00 h 10.
 */
export function estLHeureDeLaRelance(maintenant: Date, compte: CompteARelancer): boolean {
  if (localHour(maintenant, compte.timezone) !== compte.dailyReminderHour) return false;

  const age = joursEntre(
    localDay(compte.inscritLe, compte.timezone),
    localDay(maintenant, compte.timezone),
  );

  return age >= JOURS_AVANT_RELANCE && age <= JOURS_APRES_LESQUELS_ON_RENONCE;
}
