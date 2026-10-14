import { heureLocale, jourLocal } from "./jour-local";

/**
 * Qui doit recevoir le rappel quotidien à cet instant : les candidats dont
 * l'heure locale est celle de leur rappel. Le cron peut passer plusieurs fois
 * dans l'heure, d'où la clé de jour qui rend l'envoi idempotent.
 */

export type CibleDeRappel = {
  timezone: string;
  dailyReminderHour: number;
};

export type RappelDu<T extends CibleDeRappel> = {
  cible: T;
  /** Jour civil de l'utilisateur, clé d'idempotence de l'envoi. */
  jour: string;
};

export function choisirLesRappelsDus<T extends CibleDeRappel>(
  candidats: T[],
  maintenant: Date,
): RappelDu<T>[] {
  return candidats
    .filter((cible) => heureLocale(maintenant, cible.timezone) === cible.dailyReminderHour)
    .map((cible) => ({ cible, jour: jourLocal(maintenant, cible.timezone) }));
}
