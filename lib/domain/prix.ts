/**
 * Le prix affiché des deux cadences, en euros entiers. Ce n'est pas lui qui fait
 * payer : en cas d'écart, le catalogue Stripe fait foi et cette constante est
 * fausse.
 */

export const PRIX_MENSUEL = 7;

/** Dix mois payés pour douze : « deux mois offerts », vérifiable tel quel. */
export const PRIX_ANNUEL = 70;
