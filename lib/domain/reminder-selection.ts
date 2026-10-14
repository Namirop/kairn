import { localDay, localHour } from "./local-day";

/**
 * Qui doit recevoir le rappel quotidien à cet instant : les candidats dont
 * l'heure locale est celle de leur rappel. Le cron peut passer plusieurs fois
 * dans l'heure, d'où la clé de jour qui rend l'envoi idempotent.
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
