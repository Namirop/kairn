/**
 * L'adresse de l'application, pour un lien qu'une personne va cliquer ou qu'un
 * service tiers suivra pour nous ramener.
 *
 * Pas `ORIGINE_DU_SITE`, qui suit le déploiement courant : celle-ci suit
 * `BETTER_AUTH_URL`, où les sessions sont valables. Un retour de paiement sur
 * une autre origine que celle du cookie arriverait déconnecté.
 *
 * Le slash final est retiré : les appelants concatènent un chemin qui commence
 * par un slash.
 */
export function adresseDeLApp(): string {
  return (process.env.BETTER_AUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");
}
