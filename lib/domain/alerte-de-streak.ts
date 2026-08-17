import { localDay, localHour } from "./local-day";

/**
 * Quand une série est en sursis, et quand le dire.
 *
 * C'est la différence avec le rappel quotidien, et elle est entière : le rappel
 * annonce ce qui est dû, à l'heure qu'on a choisie, tous les jours. L'alerte ne
 * part que si quelque chose est en train d'être perdu — une série en cours, une
 * journée qui se termine, et rien de fait. La plupart des jours, elle ne part
 * pas ; c'est ce qui fait qu'on la lit le jour où elle part.
 */

/**
 * L'heure locale de l'alerte.
 *
 * Assez tard pour que la journée soit jouée, assez tôt pour qu'il reste le temps
 * d'une session de dix minutes. À minuit, l'alerte n'aurait plus rien à sauver.
 */
export const HEURE_DE_LALERTE = 21;

/**
 * Est-ce l'heure d'alerter ce compte-là ?
 *
 * Un compte dont le rappel quotidien tombe à cette heure-ci ou plus tard n'est
 * pas alerté : les deux messages partiraient dans le même passage, et le rappel
 * arrive déjà assez tard pour jouer ce rôle.
 */
export function estLHeureDeLAlerte(
  maintenant: Date,
  cible: { timezone: string; dailyReminderHour: number },
): boolean {
  if (cible.dailyReminderHour >= HEURE_DE_LALERTE) return false;

  return localHour(maintenant, cible.timezone) === HEURE_DE_LALERTE;
}

/**
 * La série est-elle en sursis ?
 *
 * Elle l'est quand elle existe et qu'aucun passage n'a été donné dans la journée
 * civile de la personne. Le jour se compare en étiquettes `AAAA-MM-JJ`, comme
 * partout : c'est ce qui rend le calcul insensible aux changements d'heure et aux
 * révisions de 23 h 50.
 */
export function serieEnSursis(
  maintenant: Date,
  compte: { timezone: string; currentStreak: number; dernierJourRevise: string | null },
): boolean {
  if (compte.currentStreak <= 0) return false;

  return compte.dernierJourRevise !== localDay(maintenant, compte.timezone);
}
