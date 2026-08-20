/**
 * Le compteur d'appels du banc, distinct du plafond de production.
 *
 * Le banc et la production partagent la même table de réservation, mais pas
 * leur plafond : une mesure qui consomme cent-cinquante appels ne doit pas
 * fermer la journée aux utilisateurs, et un plafond de production suffisant
 * pour un lundi d'usage courant est trop bas pour une confirmation complète.
 * Avant cette séparation, il fallait éditer `AI_DAILY_CALL_CAP` à la main
 * avant chaque mesure — un oubli au retour laissait la production ouverte à
 * la moitié du budget d'une soirée.
 *
 * Les scripts du banc appellent `appliquerCapDuBanc()` à leur démarrage, avant
 * tout `callAI`. Le cap du banc écrase la valeur du plafond en mémoire du
 * processus, sans toucher `.env` : la production ne voit rien. Si
 * `BANC_DAILY_CALL_CAP` n'est pas posé, rien ne bouge — la valeur de
 * production s'applique et l'écart précédent est reproduit.
 */

export function appliquerCapDuBanc(): void {
  const capDuBanc = process.env.BANC_DAILY_CALL_CAP?.trim();
  if (capDuBanc && capDuBanc.length > 0) {
    process.env.AI_DAILY_CALL_CAP = capDuBanc;
  }
}
