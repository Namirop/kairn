import { joursEntre, jourLocal, heureLocale } from "./jour-local";

/**
 * Quand relancer un compte qui n'a jamais rien déposé : le rappel quotidien
 * suppose quelque chose d'échu, un compte vide n'a rien.
 */

/** La raison de l'inscription est encore en tête ; au bout d'une semaine, perdue. */
export const JOURS_AVANT_RELANCE = 3;

/** Au-delà, ce serait du démarchage, et les vieux comptes se réveilleraient d'un coup. */
export const JOURS_APRES_LESQUELS_ON_RENONCE = 30;

export type CompteARelancer = {
  timezone: string;
  /** L'heure à laquelle ce compte a dit accepter d'être dérangé. */
  dailyReminderHour: number;
  inscritLe: Date;
};

/**
 * Une fenêtre plutôt qu'un jour exact, pour rattraper un passage horaire manqué :
 * l'unicité de l'envoi est garantie par `EmailDelivery`, consulté sur le type.
 * En jours civils, car une journée locale fait 23 ou 25 h aux changements d'heure.
 */
export function estLHeureDeLaRelance(maintenant: Date, compte: CompteARelancer): boolean {
  if (heureLocale(maintenant, compte.timezone) !== compte.dailyReminderHour) return false;

  const age = joursEntre(
    jourLocal(compte.inscritLe, compte.timezone),
    jourLocal(maintenant, compte.timezone),
  );

  return age >= JOURS_AVANT_RELANCE && age <= JOURS_APRES_LESQUELS_ON_RENONCE;
}
