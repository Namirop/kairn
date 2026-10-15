/**
 * Le chemin où mener quelqu'un après la connexion, lu dans l'URL : il vient du
 * client, donc il ne doit jamais sortir du site.
 *
 * Tester « commence par `/` mais pas `//` » ne suffit pas : les navigateurs
 * lisent `/\evil.com` et `/<tab>/evil.com` comme `//evil.com`. On refuse donc
 * la barre inverse et les caractères de contrôle, puis on résout le chemin
 * contre une origine fictive et on exige qu'il y reste.
 */

const ORIGINE_FICTIVE = "https://kairn.invalid";

const CARACTERES_REFUSES = /[\\\u0000-\u001f\u007f]/;

/** Le chemin interne normalisé, ou `null` s'il mènerait ailleurs. */
export function cheminDeSuite(valeur: string | undefined): string | null {
  if (valeur === undefined || !valeur.startsWith("/") || valeur.startsWith("//")) return null;
  if (CARACTERES_REFUSES.test(valeur)) return null;

  const resolu = new URL(valeur, ORIGINE_FICTIVE);

  if (resolu.origin !== ORIGINE_FICTIVE) return null;

  return `${resolu.pathname}${resolu.search}${resolu.hash}`;
}
