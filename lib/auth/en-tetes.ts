/**
 * Les en-têtes que le navigateur ajoute aux requêtes d'authentification.
 *
 * Ce fichier ne dépend de rien, et c'est tout son intérêt : `lib/auth/config.ts`
 * importe Prisma, donc un composant client qui y prendrait ce nom tirerait la
 * configuration serveur dans son paquet. Le formulaire recopiait la chaîne à la
 * main, ce qui marche jusqu'au jour où l'une des deux change.
 */

/**
 * Le fuseau détecté par le navigateur, au moment où un compte se crée.
 *
 * C'est le seul instant où il peut se dire : la création par lien email ou par
 * Google n'a pas d'autre occasion de le porter, et une échéance affichée dans le
 * mauvais calendrier est fausse pour toute la vie du compte.
 */
export const TIMEZONE_HEADER = "x-cairn-timezone";
