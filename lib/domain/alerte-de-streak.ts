import { localDay, localHour } from "./local-day";

/**
 * Quand une série est en sursis, et quand le dire. Contrairement au rappel
 * quotidien, l'alerte ne part que si une série est en train d'être perdue : rare,
 * elle est lue le jour où elle part.
 */

/**
 * L'heure locale de l'alerte : la journée est jouée, et il reste le temps d'une
 * session avant minuit.
 */
export const HEURE_DE_LALERTE = 21;

/**
 * Est-ce l'heure d'alerter ce compte-là ? Pas si son rappel quotidien tombe à
 * cette heure ou plus tard : il joue déjà ce rôle, et deux messages partiraient
 * ensemble.
 */
export function estLHeureDeLAlerte(
  maintenant: Date,
  cible: { timezone: string; dailyReminderHour: number },
): boolean {
  if (cible.dailyReminderHour >= HEURE_DE_LALERTE) return false;

  return localHour(maintenant, cible.timezone) === HEURE_DE_LALERTE;
}

/**
 * La série est-elle en sursis : en cours, sans passage dans la journée civile
 * de la personne ? Les jours se comparent en étiquettes `AAAA-MM-JJ`, insensibles
 * aux changements d'heure.
 */
export function serieEnSursis(
  maintenant: Date,
  compte: { timezone: string; currentStreak: number; dernierJourRevise: string | null },
): boolean {
  if (compte.currentStreak <= 0) return false;

  return compte.dernierJourRevise !== localDay(maintenant, compte.timezone);
}
