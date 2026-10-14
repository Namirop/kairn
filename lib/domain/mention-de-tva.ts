/**
 * Ce que les factures doivent dire de la TVA.
 *
 * En franchise en base, la mention de l'article 293 B est obligatoire sur
 * chaque facture ; son absence ne se remarque qu'au contrôle.
 *
 * Les deux valeurs de ce fichier bougent ensemble : si la TVA se collecte, la
 * mention devient fausse. Le test verrouille ce couplage.
 */

/** La mention exigée d'une entreprise en franchise en base. */
export const MENTION_FRANCHISE = "TVA non applicable, article 293 B du CGI";

/**
 * Le produit collecte-t-il la TVA ? Non : micro-entreprise en franchise en
 * base, prix Stripe marqués TTC, aucune taxe calculée dans le code.
 *
 * Ce drapeau constate, il n'agit pas : le passer à `true` exige aussi
 * d'activer le calcul de taxe côté Stripe.
 */
export const TVA_COLLECTEE = false;

/** Le pied de page d'une facture, ou rien quand la TVA est collectée. */
export function mentionDeFacture(tvaCollectee: boolean): string | null {
  return tvaCollectee ? null : MENTION_FRANCHISE;
}
