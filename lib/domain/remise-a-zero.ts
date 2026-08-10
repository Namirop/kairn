import { localDay, localHour } from "./local-day";

/**
 * Quand le compteur du jour repart.
 *
 * C'est minuit chez l'utilisateur, pas chez le serveur. Dire « demain » à
 * quelqu'un qui dépose à 23 h 50 serait faux d'exactement dix minutes.
 */

/** Minutes restantes avant le prochain minuit local. */
export function minutesAvantMinuit(maintenant: Date, fuseau: string): number {
  const heure = localHour(maintenant, fuseau);
  const minutesDeLHeure = Number.parseInt(
    new Intl.DateTimeFormat("en-GB", { timeZone: fuseau, minute: "2-digit" }).format(maintenant),
    10,
  );

  return (24 - heure) * 60 - (Number.isNaN(minutesDeLHeure) ? 0 : minutesDeLHeure);
}

/** Le même instant, dit en français : « dans deux heures », « demain ». */
export function quandRepartLeCompteur(maintenant: Date, fuseau: string): string {
  const minutes = minutesAvantMinuit(maintenant, fuseau);

  if (minutes <= 1) return "dans une minute";
  if (minutes < 60) return `dans ${minutes} minutes`;

  const heures = Math.round(minutes / 60);

  if (heures === 1) return "dans une heure";
  if (heures <= 6) return `dans ${heures} heures`;

  return "à minuit";
}

/** Le jour civil de l'utilisateur, pour les compteurs qui s'y rattachent. */
export function jourDeLUtilisateur(maintenant: Date, fuseau: string): string {
  return localDay(maintenant, fuseau);
}
