/**
 * Passage d'un instant au calendrier de l'utilisateur. Les échéances restent en
 * UTC ; le fuseau ne dit que quel jour il est et s'il est l'heure d'écrire.
 */

/** `AAAA-MM-JJ`, d'où `en-CA`. */
export function jourLocal(instant: Date, fuseau: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: fuseau,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(instant);
}

/** Heure locale de l'utilisateur, de 0 à 23. */
export function heureLocale(instant: Date, fuseau: string): number {
  const formatee = new Intl.DateTimeFormat("en-GB", {
    timeZone: fuseau,
    hour: "2-digit",
    hour12: false,
  }).format(instant);

  const heure = Number.parseInt(formatee, 10);
  return Number.isNaN(heure) ? 0 : heure % 24;
}

/** Vrai si le fuseau est un identifiant IANA que la plateforme sait résoudre. */
export function fuseauReconnu(fuseau: string): boolean {
  try {
    new Intl.DateTimeFormat("en-CA", { timeZone: fuseau });
    return true;
  } catch {
    return false;
  }
}

/** Minuit UTC du jour civil donné — la forme stockée dans les colonnes `Date`. */
export function jourEnDateUtc(jour: string): Date {
  return new Date(`${jour}T00:00:00.000Z`);
}

/**
 * Le lendemain d'un jour civil. Par minuit UTC et non par l'heure locale : une
 * journée locale fait 23 ou 25 h aux changements d'heure.
 */
export function jourSuivant(jour: string): string {
  const lendemain = new Date(jourEnDateUtc(jour).getTime() + 24 * 60 * 60 * 1000);

  return lendemain.toISOString().slice(0, 10);
}

/**
 * Par les étiquettes et non par les instants : hier 22 h et ce matin 8 h font
 * un jour. Négatif si le second précède le premier.
 */
export function joursEntre(depuis: string, jusqua: string): number {
  const ecart = jourEnDateUtc(jusqua).getTime() - jourEnDateUtc(depuis).getTime();

  return Math.round(ecart / (24 * 60 * 60 * 1000));
}
