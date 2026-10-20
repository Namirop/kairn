/**
 * Sans dépendance : pris dans `lib/auth/config.ts`, qui importe Prisma, ce nom
 * tirerait la configuration serveur dans le paquet client.
 */

/** Posé par la connexion par code à la création du compte ; absent par Google. */
export const ENTETE_DU_FUSEAU = "x-cairn-timezone";
