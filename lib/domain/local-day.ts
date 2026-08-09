/**
 * Passage d'un instant au calendrier de l'utilisateur.
 *
 * Toute échéance se calcule en UTC. Le fuseau ne sert qu'à deux choses : savoir
 * quel jour il est pour lui — un passage à 23 h 50 et un à 00 h 10 ne sont pas
 * le même jour — et savoir s'il est l'heure de lui écrire.
 *
 * `en-CA` est utilisé pour son format de date : il rend `AAAA-MM-JJ`.
 */

/** Jour civil de l'utilisateur, au format `AAAA-MM-JJ`. */
export function localDay(instant: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(instant);
}

/** Heure locale de l'utilisateur, de 0 à 23. */
export function localHour(instant: Date, timeZone: string): number {
  const formatted = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    hour12: false,
  }).format(instant);

  const hour = Number.parseInt(formatted, 10);
  return Number.isNaN(hour) ? 0 : hour % 24;
}

/** Vrai si le fuseau est un identifiant IANA que la plateforme sait résoudre. */
export function isSupportedTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-CA", { timeZone });
    return true;
  } catch {
    return false;
  }
}

/** Minuit UTC du jour civil donné — la forme stockée dans les colonnes `Date`. */
export function dayToUtcDate(day: string): Date {
  return new Date(`${day}T00:00:00.000Z`);
}
