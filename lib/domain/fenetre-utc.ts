import { localDay } from "./local-day";

/**
 * Les bornes de temps des écrans qui comptent, toutes en UTC.
 *
 * Pourquoi UTC et pas le fuseau de qui regarde : ces fenêtres servent à lire des
 * compteurs qui, eux, sont tenus en UTC — le plafond d'appels du jour en
 * particulier. Une fenêtre calculée dans un autre calendrier ne recouvrirait pas
 * les lignes qu'elle prétend résumer, et l'écart ne se verrait qu'aux heures où
 * les deux jours ne coïncident pas.
 *
 * Ces fonctions ne lisent jamais l'horloge : l'instant leur est passé, ce qui les
 * rend testables et rend les écrans reproductibles.
 */

/** L'instant situé `jours` avant celui donné. */
export function ilYA(instant: Date, jours: number): Date {
  return new Date(instant.getTime() - jours * 24 * 60 * 60 * 1000);
}

/**
 * Minuit UTC du jour où tombe cet instant.
 *
 * Passe par l'étiquette `AAAA-MM-JJ` plutôt que par les composantes de la date :
 * c'est ce qui rend le résultat indépendant du fuseau de la machine qui exécute,
 * là où un `setHours(0)` aurait rendu minuit *local*.
 */
export function debutDuJourUtc(instant: Date): Date {
  return new Date(`${localDay(instant, "UTC")}T00:00:00.000Z`);
}
