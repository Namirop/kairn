import { joursEntre, jourLocal, heureLocale } from "./jour-local";

/**
 * Quand relancer un compte qui n'a jamais rien déposé. Le rappel quotidien et
 * l'alerte de série supposent quelque chose d'échu ; un compte vide n'en a pas,
 * d'où cette relance à part.
 */

/**
 * Trois jours : la raison de l'inscription (l'article, la conversation) est
 * encore en tête ; au bout d'une semaine, elle est perdue.
 */
export const JOURS_AVANT_RELANCE = 3;

/**
 * Au-delà, on renonce : ce serait du démarchage. La borne évite aussi de
 * réveiller d'un coup les vieux comptes abandonnés.
 */
export const JOURS_APRES_LESQUELS_ON_RENONCE = 30;

export type CompteARelancer = {
  timezone: string;
  /** L'heure à laquelle ce compte a dit accepter d'être dérangé. */
  dailyReminderHour: number;
  inscritLe: Date;
};

/**
 * Est-ce l'heure de relancer ce compte-là ? Il est l'heure chez lui, et son
 * inscription date de `JOURS_AVANT_RELANCE` à `JOURS_APRES_LESQUELS_ON_RENONCE`
 * jours civils.
 *
 * Une fenêtre plutôt qu'un jour exact, pour qu'un passage horaire manqué se
 * rattrape le lendemain. L'unicité de l'envoi n'est donc pas garantie ici mais
 * par `EmailDelivery`, consulté sur le type et non sur le jour.
 *
 * Les jours se comptent en étiquettes `AAAA-MM-JJ`, pas en tranches de 24 h :
 * une journée locale fait 23 ou 25 h aux changements d'heure.
 */
export function estLHeureDeLaRelance(maintenant: Date, compte: CompteARelancer): boolean {
  if (heureLocale(maintenant, compte.timezone) !== compte.dailyReminderHour) return false;

  const age = joursEntre(
    jourLocal(compte.inscritLe, compte.timezone),
    jourLocal(maintenant, compte.timezone),
  );

  return age >= JOURS_AVANT_RELANCE && age <= JOURS_APRES_LESQUELS_ON_RENONCE;
}
