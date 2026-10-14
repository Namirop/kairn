/**
 * Le prix des deux cadences, en euros : la page de tarifs, l'écran de l'offre et
 * le contrôle de ce que Stripe rapporte lisent le même chiffre.
 *
 * Ce ne sont pas eux qui font payer : est encaissé ce que Stripe a enregistré
 * pour l'identifiant de prix. En cas d'écart, le catalogue Stripe fait foi et
 * cette constante est fausse.
 *
 * Entiers : un prix rond se lit sans décimale.
 */

export const PRIX_MENSUEL = 7;

/** Dix mois payés pour douze : « deux mois offerts », vérifiable tel quel. */
export const PRIX_ANNUEL = 70;
