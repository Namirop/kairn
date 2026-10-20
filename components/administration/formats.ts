/** En un seul endroit : deux nombres formatés différemment ne se comparent plus. */

const NOMBRE = new Intl.NumberFormat("fr-FR");

/** Quatre décimales sous le dollar : avec deux, deux petites journées se confondraient. */
function formatDollars(valeur: number): Intl.NumberFormat {
  const decimales = Math.abs(valeur) >= 1 ? 2 : 4;

  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  });
}

/** Là où le chiffre n'existe pas. Jamais un zéro. */
export const ABSENT = "—";

export function nombre(valeur: number): string {
  return NOMBRE.format(valeur);
}

export function dollars(valeur: number | null): string {
  if (valeur === null) return ABSENT;

  return formatDollars(valeur).format(valeur);
}

export function moyenne(valeur: number | null): string {
  if (valeur === null) return ABSENT;

  return valeur.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}
