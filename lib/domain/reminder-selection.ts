import { localDay, localHour } from "./local-day";

/**
 * Qui doit recevoir le rappel quotidien à cet instant.
 *
 * Fonction pure : le cron horaire lui passe les candidats lus en base et
 * l'heure courante, elle rend ceux dont l'heure locale correspond. Aucun accès
 * données, donc testable sans base ni horloge système.
 */

export type ReminderTarget = {
  timezone: string;
  dailyReminderHour: number;
};

export type SelectedReminder<T extends ReminderTarget> = {
  target: T;
  /** Jour civil de l'utilisateur, clé d'idempotence de l'envoi. */
  day: string;
};

export function selectDueForReminder<T extends ReminderTarget>(
  candidates: T[],
  now: Date,
): SelectedReminder<T>[] {
  return candidates
    .filter((target) => localHour(now, target.timezone) === target.dailyReminderHour)
    .map((target) => ({ target, day: localDay(now, target.timezone) }));
}
