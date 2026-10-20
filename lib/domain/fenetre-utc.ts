import { jourLocal } from "./jour-local";

/**
 * Les bornes des écrans qui comptent, en UTC : elles lisent des compteurs tenus
 * en UTC, qu'une fenêtre locale ne recouvrirait pas.
 */

export function ilYA(instant: Date, jours: number): Date {
  return new Date(instant.getTime() - jours * 24 * 60 * 60 * 1000);
}

/** Par l'étiquette `AAAA-MM-JJ` : un `setHours(0)` rendrait le minuit local de la machine. */
export function debutDuJourUtc(instant: Date): Date {
  return new Date(`${jourLocal(instant, "UTC")}T00:00:00.000Z`);
}
