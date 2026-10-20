import { jourLocal, heureLocale } from "./jour-local";

/** Quand une série est en sursis, et quand le dire. */

/** La journée est jouée, et il reste le temps d'une session avant minuit. */
export const HEURE_DE_LALERTE = 21;

/** Pas si le rappel quotidien tombe à cette heure ou après : il joue déjà ce rôle. */
export function estLHeureDeLAlerte(
  maintenant: Date,
  cible: { timezone: string; dailyReminderHour: number },
): boolean {
  if (cible.dailyReminderHour >= HEURE_DE_LALERTE) return false;

  return heureLocale(maintenant, cible.timezone) === HEURE_DE_LALERTE;
}

/**
 * En cours, sans passage dans la journée locale. Les jours se comparent en
 * étiquettes `AAAA-MM-JJ`, insensibles aux changements d'heure.
 */
export function serieEnSursis(
  maintenant: Date,
  compte: { timezone: string; currentStreak: number; dernierJourRevise: string | null },
): boolean {
  if (compte.currentStreak <= 0) return false;

  return compte.dernierJourRevise !== jourLocal(maintenant, compte.timezone);
}
