/**
 * Ce qu'un texte déposé sans compte a le droit de faire.
 *
 * Dans son propre fichier parce que l'écran en a besoin autant que le serveur :
 * le compteur du champ et le refus de Zod disent le même nombre, et il ne doit
 * exister qu'une fois. `deposer-sans-compte.ts` importe Prisma, donc l'y laisser
 * aurait tiré le client de base de données dans le paquet du navigateur — c'est
 * exactement ce qui a fait recopier la borne à la main dans le formulaire du
 * produit, et une valeur en double est une valeur qui finit par diverger.
 *
 * Le maximum est la moitié de celui d'un compte. Un visiteur ne paie rien et
 * n'est identifié par rien ; ce qu'on lui offre est une démonstration, pas un
 * usage. Le minimum, lui, ne protège pas le budget : en dessous, il n'y a rien
 * à découper, et la démonstration tombe à plat.
 */

export const CARACTERES_MAXIMUM_ANONYME = 4000;
export const CARACTERES_MINIMUM_ANONYME = 40;
