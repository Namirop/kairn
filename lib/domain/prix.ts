/**
 * Le prix des deux cadences, en euros.
 *
 * Ils vivent ici et non dans le composant qui les affiche, pour la même raison
 * que les plafonds : la page de tarifs, l'écran de l'offre et le contrôle de ce
 * que Stripe rapporte doivent lire le même chiffre. Un prix recopié dans une
 * page finit par différer de celui qu'on encaisse, et c'est le genre d'écart
 * qu'on découvre par une réclamation.
 *
 * **Ce ne sont pas eux qui font payer.** Ce qui est encaissé est ce que Stripe
 * a enregistré pour l'identifiant de prix appelé ; ces valeurs disent seulement
 * ce que le produit annonce. Les deux se vérifient l'un l'autre — si un jour ils
 * divergent, c'est le catalogue Stripe qui fait foi et cette constante qui est
 * fausse.
 *
 * Entiers : le produit ne se vend pas à 6,99 €. Un prix rond se lit sans
 * décimale et n'a pas besoin d'être formaté.
 */

export const PRIX_MENSUEL = 7;

/**
 * Dix mois payés pour douze.
 *
 * Le rapport est choisi pour se dire en trois mots — « deux mois offerts » — et
 * non pour tomber sur un chiffre publicitaire. Un lecteur qui vérifie doit
 * trouver exactement ce qu'on lui annonce.
 */
export const PRIX_ANNUEL = 70;
