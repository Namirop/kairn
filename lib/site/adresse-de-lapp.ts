/**
 * Pour un lien cliqué ou suivi par un tiers. Suit `BETTER_AUTH_URL`, pas
 * `ORIGINE_DU_SITE` : un retour de paiement hors de l'origine du cookie
 * arriverait déconnecté.
 */
export function adresseDeLApp(): string {
  return (process.env.BETTER_AUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");
}
