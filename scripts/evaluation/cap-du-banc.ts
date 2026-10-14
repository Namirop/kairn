/**
 * Le plafond d'appels du banc, distinct de celui de la production : un plafond
 * réglé pour l'usage courant est trop bas pour une confirmation complète, et
 * le relever dans `.env` à la main, c'est risquer d'oublier de le redescendre.
 *
 * À appeler au démarrage d'un script du banc, avant tout `callAI`.
 * `BANC_DAILY_CALL_CAP` remplace `AI_DAILY_CALL_CAP` dans ce processus
 * seulement ; absent, le plafond de production s'applique.
 */

export function appliquerCapDuBanc(): void {
  const capDuBanc = process.env.BANC_DAILY_CALL_CAP?.trim();
  if (capDuBanc && capDuBanc.length > 0) {
    process.env.AI_DAILY_CALL_CAP = capDuBanc;
  }
}
