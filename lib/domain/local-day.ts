/**
 * Passage d'un instant au calendrier de l'utilisateur.
 *
 * Toute échéance se calcule en UTC. Le fuseau ne sert qu'à savoir quel jour il
 * est pour lui, et s'il est l'heure de lui écrire.
 *
 * `en-CA` est choisi pour son format de date : il rend `AAAA-MM-JJ`.
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

/**
 * Le lendemain d'un jour civil. Par minuit UTC et non par l'heure locale : une
 * journée locale fait 23 ou 25 h aux changements d'heure.
 */
export function jourSuivant(day: string): string {
  const lendemain = new Date(dayToUtcDate(day).getTime() + 24 * 60 * 60 * 1000);

  return lendemain.toISOString().slice(0, 10);
}

/**
 * Combien de jours civils séparent deux jours locaux. Négatif si le second
 * précède le premier.
 *
 * Par les étiquettes et non par l'écart entre deux instants : hier 22 h et ce
 * matin 8 h font dix heures, mais bien un jour.
 */
export function joursEntre(depuis: string, jusqua: string): number {
  const ecart = dayToUtcDate(jusqua).getTime() - dayToUtcDate(depuis).getTime();

  return Math.round(ecart / (24 * 60 * 60 * 1000));
}
