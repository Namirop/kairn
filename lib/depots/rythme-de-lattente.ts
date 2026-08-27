/**
 * Le rythme auquel un écran redemande où en est une extraction.
 *
 * Deux écrans attendent la même chose : l'essai de la landing, et le détail
 * d'un dépôt. Ils partagent donc les mêmes valeurs — deux cadences qui doivent
 * être égales et qui vivraient à deux endroits finiraient par diverger, et
 * c'est l'un des deux écrans qui abandonnerait trop tôt sans que personne
 * l'ait décidé.
 *
 * **Une seconde d'abord.** Le résultat apparaît au plus tard une seconde après
 * être prêt, l'appel est léger, et une demi-seconde de retard se voit sur cinq.
 *
 * **À quinze secondes, on le dit.** Une minute de tourniquet est une minute où
 * plus personne ne regarde — quelqu'un qui attend cinq secondes d'habitude est
 * parti bien avant. Mais on ne s'arrête pas pour autant : un pavé de quatre
 * mille caractères peut mettre vingt secondes sans que rien n'aille mal, et
 * couper à quinze condamnerait une extraction qui allait aboutir. On ralentit,
 * l'écran dit qu'il ne sait plus, et si le résultat tombe il s'affiche de
 * lui-même.
 *
 * **À quatre-vingt-dix secondes, on arrête vraiment.** Au-delà, ce n'est plus
 * une extraction lente, c'est un job reporté ou perdu : le cron le reprendra,
 * et l'écran n'a plus rien à apprendre en insistant.
 */

export const RYTHME_VIF_MS = 1000;
export const RYTHME_LENT_MS = 5000;
export const AVEU_MS = 15_000;
export const ABANDON_MS = 90_000;

/** La pause avant le prochain tour, selon le temps déjà passé à attendre. */
export function pauseApres(ecouleMs: number): number {
  return ecouleMs < AVEU_MS ? RYTHME_VIF_MS : RYTHME_LENT_MS;
}
