/**
 * Dire une échéance d'abonnement à quelqu'un.
 *
 * Le terme d'un abonnement peut être à un an : « dans 312 jours » ne situe
 * rien, et « le 12 octobre » sans l'année devient ambigu passé le nouvel an. On
 * nomme donc le jour en entier. C'est l'inverse du choix fait pour la remise à
 * zéro du quota, qui est toujours proche et se compte mieux en jours — deux
 * échéances de nature différente, deux façons de les dire.
 *
 * **Le jour est celui de l'utilisateur, pas celui d'UTC.** Un abonnement qui
 * finit le 11 à 23 h 30 UTC finit le 12 à Paris et le 11 à New York : afficher
 * la date UTC ferait mentir l'écran d'une journée pour tout l'hémisphère est,
 * et personne ne pense à vérifier ce genre de phrase.
 *
 * La langue est passée par l'appelant, comme le fuseau : ni l'une ni l'autre ne
 * se devine ici, et un défaut ferait écrire « 12 octobre » à un anglophone.
 */
export function termeLisible(echeance: Date, fuseau: string, etiquette: string): string {
  return new Intl.DateTimeFormat(etiquette, {
    dateStyle: "long",
    timeZone: fuseau,
  }).format(echeance);
}
