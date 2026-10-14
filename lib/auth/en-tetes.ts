/**
 * Les en-têtes que le navigateur ajoute aux requêtes d'authentification.
 *
 * Ce fichier ne dépend de rien : `lib/auth/config.ts` importe Prisma, et un
 * composant client qui y prendrait ce nom tirerait la configuration serveur
 * dans son paquet.
 */

/**
 * Le fuseau détecté par le navigateur, posé par la connexion par code quand un
 * compte se crée. Par Google il manque : la coquille de l'application le
 * réconcilie au premier affichage.
 */
export const ENTETE_DU_FUSEAU = "x-cairn-timezone";
