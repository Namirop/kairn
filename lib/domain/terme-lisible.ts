/**
 * Une échéance d'abonnement, jusqu'à un an : le jour en entier, année comprise.
 * Fuseau et langue viennent de l'appelant : 23 h 30 UTC le 11 est déjà le 12 à
 * Paris, et un défaut écrirait du français à un anglophone.
 */
export function termeLisible(echeance: Date, fuseau: string, etiquette: string): string {
  return new Intl.DateTimeFormat(etiquette, {
    dateStyle: "long",
    timeZone: fuseau,
  }).format(echeance);
}
