import { jourLocal } from "./jour-local";

/**
 * Les bornes de temps des écrans qui comptent, en UTC et non dans le fuseau de
 * qui regarde : elles lisent des compteurs tenus en UTC (le plafond d'appels du
 * jour), qu'une fenêtre locale ne recouvrirait pas.
 */

/** L'instant situé `jours` avant celui donné. */
export function ilYA(instant: Date, jours: number): Date {
  return new Date(instant.getTime() - jours * 24 * 60 * 60 * 1000);
}

/**
 * Minuit UTC du jour où tombe cet instant. Passe par l'étiquette `AAAA-MM-JJ` :
 * un `setHours(0)` rendrait le minuit local de la machine.
 */
export function debutDuJourUtc(instant: Date): Date {
  return new Date(`${jourLocal(instant, "UTC")}T00:00:00.000Z`);
}
