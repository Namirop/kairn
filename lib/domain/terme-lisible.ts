/**
 * Dire une échéance d'abonnement à quelqu'un.
 *
 * Le terme peut être à un an : on nomme le jour en entier, année comprise,
 * plutôt qu'en jours comme la remise à zéro du quota, toujours proche.
 *
 * Le jour est celui du fuseau de l'utilisateur : 23 h 30 UTC le 11 est déjà le
 * 12 à Paris. La langue est passée par l'appelant, comme le fuseau : un défaut
 * écrirait du français à un anglophone.
 */
export function termeLisible(echeance: Date, fuseau: string, etiquette: string): string {
  return new Intl.DateTimeFormat(etiquette, {
    dateStyle: "long",
    timeZone: fuseau,
  }).format(echeance);
}
