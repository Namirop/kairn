/**
 * En franchise en base, la mention de l'article 293 B est obligatoire sur
 * chaque facture. Les deux valeurs bougent ensemble ; le test verrouille ce
 * couplage.
 */

export const MENTION_FRANCHISE = "TVA non applicable, article 293 B du CGI";

/**
 * Prix Stripe marqués TTC, aucune taxe calculée. Ce drapeau constate, il n'agit
 * pas : le passer à `true` exige d'activer le calcul de taxe côté Stripe.
 */
export const TVA_COLLECTEE = false;

export function mentionDeFacture(tvaCollectee: boolean): string | null {
  return tvaCollectee ? null : MENTION_FRANCHISE;
}
