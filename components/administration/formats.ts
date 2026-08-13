/**
 * Le formatage des chiffres de l'écran d'administration.
 *
 * Séparé des composants parce que c'est une décision et pas un détail : sur un
 * écran qu'on lit d'un coup d'œil, deux nombres formatés différemment ne se
 * comparent plus.
 */

const NOMBRE = new Intl.NumberFormat("fr-FR");

/**
 * Deux décimales au-dessus du dollar, quatre en dessous.
 *
 * Une dépense de départ se compte en centièmes de dollar : arrondir à deux
 * décimales afficherait « 0,03 $ » pour tout un après-midi, et deux journées
 * différentes s'y liraient identiques. Passé le dollar, quatre décimales ne sont
 * plus que du bruit.
 */
function formatDollars(valeur: number): Intl.NumberFormat {
  const decimales = Math.abs(valeur) >= 1 ? 2 : 4;

  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  });
}

/** Ce qu'on affiche là où le chiffre n'existe pas. Jamais un zéro. */
export const ABSENT = "—";

export function nombre(valeur: number): string {
  return NOMBRE.format(valeur);
}

export function dollars(valeur: number | null): string {
  if (valeur === null) return ABSENT;

  return formatDollars(valeur).format(valeur);
}

/** Une moyenne à une décimale, ou rien quand le dénominateur est nul. */
export function moyenne(valeur: number | null): string {
  if (valeur === null) return ABSENT;

  return valeur.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}
