/**
 * L'adresse de l'application, celle qu'on met dans un lien qu'une personne va
 * cliquer, ou qu'on donne à un service tiers pour qu'il nous y ramène.
 *
 * À distinguer d'`ORIGINE_DU_SITE`, qui sert aux métadonnées et au manifeste et
 * suit le déploiement courant. Celle-ci suit `BETTER_AUTH_URL`, c'est-à-dire
 * l'adresse où les sessions sont valables : un retour de paiement qui arrive
 * sur une autre origine que celle du cookie arrive déconnecté.
 *
 * Le repli local existe pour le développement, où la variable n'est pas
 * toujours posée. Le slash final est retiré parce que tout ce qui construit une
 * URL ici concatène un chemin qui commence par un slash.
 */
export function adresseDeLApp(): string {
  return (process.env.BETTER_AUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");
}
