/**
 * Ce que les factures doivent dire de la TVA.
 *
 * Une entreprise en franchise en base ne facture pas la TVA, et doit l'écrire :
 * la mention de l'article 293 B est obligatoire sur chaque facture. Son absence
 * est un défaut de facturation, et c'est le genre de manquement qui ne se
 * remarque qu'au contrôle — aucun client ne réclamera jamais une mention qui
 * manque.
 *
 * **Les deux valeurs de ce fichier bougent ensemble, jamais l'une sans
 * l'autre.** Le jour où le seuil est franchi et où la TVA se collecte, la
 * mention devient fausse : elle affirmerait le contraire de ce qui est débité.
 * Le test verrouille ce couplage — c'est tout l'intérêt d'un drapeau plutôt que
 * d'une chaîne posée directement dans l'appel à Stripe.
 */

/** La mention exigée d'une entreprise en franchise en base. */
export const MENTION_FRANCHISE = "TVA non applicable, article 293 B du CGI";

/**
 * Le produit collecte-t-il la TVA ?
 *
 * Non : micro-entreprise en franchise en base. Rien dans le code ne calcule ni
 * n'ajoute de taxe, et les prix Stripe sont marqués TTC — ce qui est débité est
 * exactement ce que la page annonce.
 *
 * Passer ce drapeau à `true` ne suffira pas : il faudra aussi activer le calcul
 * de taxe côté Stripe. Il dit ce qui est vrai, il ne le rend pas vrai.
 */
export const TVA_COLLECTEE = false;

/** Le pied de page d'une facture, ou rien quand la TVA est collectée. */
export function mentionDeFacture(tvaCollectee: boolean): string | null {
  return tvaCollectee ? null : MENTION_FRANCHISE;
}
