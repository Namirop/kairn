import { prisma } from "@/lib/db/client";
import { dayToUtcDate, localDay } from "@/lib/domain/local-day";

/**
 * Réservation de places d'appel modèle pour la journée en cours.
 *
 * Lire puis écrire un compteur laisse passer deux appels simultanés. Ici,
 * l'incrément et le refus tiennent dans une seule instruction : quand la clause
 * `WHERE` du `DO UPDATE` est fausse, `RETURNING` ne rend rien, et ce « rien »
 * vaut refus.
 *
 * La place globale n'est jamais rendue : un appel qui échoue a pu consommer des
 * tokens.
 */

export type Reservation = {
  obtenue: boolean;
  /** Places consommées après l'opération, ou déjà consommées en cas de refus. */
  utilisees: number;
};

/** Le plafond est global au produit, la journée se compte donc en UTC. */
function jourUtc(instant: Date): string {
  return localDay(instant, "UTC");
}

/** Réserve `places` d'un coup, ou aucune. */
export async function reserverAppelsModele(
  plafond: number,
  places: number,
  maintenant: Date = new Date(),
): Promise<Reservation> {
  const jour = jourUtc(maintenant);

  // La clause `WHERE` ne garde que le `DO UPDATE` : la première réservation de
  // la journée s'insère sans être confrontée au plafond. Sans cette garde, une
  // demande plus grosse que le plafond passerait entière juste après minuit UTC.
  if (places > plafond) {
    return { obtenue: false, utilisees: await lireReservationsDuJour(maintenant) };
  }

  const lignes = await prisma.$queryRaw<{ reserved: number }[]>`
    INSERT INTO "AiCallQuota" ("day", "reserved", "createdAt", "updatedAt")
    VALUES (${jour}::date, ${places}, now(), now())
    ON CONFLICT ("day") DO UPDATE
      SET "reserved" = "AiCallQuota"."reserved" + ${places},
          "updatedAt" = now()
      WHERE "AiCallQuota"."reserved" + ${places} <= ${plafond}
    RETURNING "reserved"
  `;

  const obtenue = lignes[0];

  if (obtenue) {
    return { obtenue: true, utilisees: obtenue.reserved };
  }

  return { obtenue: false, utilisees: await lireReservationsDuJour(maintenant) };
}

export async function reserverAppelModele(
  plafond: number,
  maintenant: Date = new Date(),
): Promise<Reservation> {
  return reserverAppelsModele(plafond, 1, maintenant);
}

/**
 * La part d'un compte dans les appels du jour.
 *
 * Le plafond global protège le budget, pas un compte de son voisin : un seul
 * compte pourrait fermer la journée de tous. Ce second verrou est pris **avant**
 * la place globale, avec la même instruction atomique, et se compte en UTC
 * comme elle pour que les deux fenêtres ferment au même instant.
 */
export async function reserverPlacesDeCompte(
  userId: string,
  plafond: number,
  places: number,
  maintenant: Date = new Date(),
): Promise<Reservation> {
  // Même garde que pour le plafond global : la première réservation du jour
  // échappe à la clause `WHERE`.
  if (places > plafond) {
    return { obtenue: false, utilisees: await lirePlacesDeCompte(userId, maintenant) };
  }

  const jour = jourUtc(maintenant);
  const lignes = await prisma.$queryRaw<{ reserved: number }[]>`
    INSERT INTO "AiUserQuota" ("userId", "day", "reserved", "createdAt", "updatedAt")
    VALUES (${userId}, ${jour}::date, ${places}, now(), now())
    ON CONFLICT ("userId", "day") DO UPDATE
      SET "reserved" = "AiUserQuota"."reserved" + ${places},
          "updatedAt" = now()
      WHERE "AiUserQuota"."reserved" + ${places} <= ${plafond}
    RETURNING "reserved"
  `;

  const obtenue = lignes[0];

  if (obtenue) return { obtenue: true, utilisees: obtenue.reserved };

  return { obtenue: false, utilisees: await lirePlacesDeCompte(userId, maintenant) };
}

export async function reserverPlaceDeCompte(
  userId: string,
  plafond: number,
  maintenant: Date = new Date(),
): Promise<Reservation> {
  return reserverPlacesDeCompte(userId, plafond, 1, maintenant);
}

/**
 * La part du trafic sans compte dans les appels du jour.
 *
 * Un seul seau pour tous les visiteurs : on borne ce que la landing peut prendre
 * au produit. La répartition entre visiteurs relève de `VISITES_PAR_ADRESSE`.
 */
export async function reserverPlaceAnonyme(
  plafond: number,
  maintenant: Date = new Date(),
): Promise<Reservation> {
  // Même garde que les deux autres compteurs : la première réservation du jour
  // échappe à la clause `WHERE`, et un plafond à zéro doit tout refuser.
  if (plafond < 1) {
    return { obtenue: false, utilisees: await lirePlacesAnonymes(maintenant) };
  }

  const jour = jourUtc(maintenant);
  const lignes = await prisma.$queryRaw<{ reserved: number }[]>`
    INSERT INTO "AiAnonymousQuota" ("day", "reserved", "createdAt", "updatedAt")
    VALUES (${jour}::date, 1, now(), now())
    ON CONFLICT ("day") DO UPDATE
      SET "reserved" = "AiAnonymousQuota"."reserved" + 1,
          "updatedAt" = now()
      WHERE "AiAnonymousQuota"."reserved" + 1 <= ${plafond}
    RETURNING "reserved"
  `;

  const obtenue = lignes[0];

  if (obtenue) return { obtenue: true, utilisees: obtenue.reserved };

  return { obtenue: false, utilisees: await lirePlacesAnonymes(maintenant) };
}

/**
 * Rend une place anonyme prise pour rien : la place globale a été refusée juste
 * après, rien n'a été émis.
 */
export async function rendrePlaceAnonyme(maintenant: Date = new Date()): Promise<void> {
  await prisma.aiAnonymousQuota.updateMany({
    where: { day: dayToUtcDate(jourUtc(maintenant)), reserved: { gte: 1 } },
    data: { reserved: { decrement: 1 } },
  });
}

export async function lirePlacesAnonymes(maintenant: Date = new Date()): Promise<number> {
  const lignes = await prisma.$queryRaw<{ reserved: number }[]>`
    SELECT "reserved" FROM "AiAnonymousQuota" WHERE "day" = ${jourUtc(maintenant)}::date
  `;

  return lignes[0]?.reserved ?? 0;
}

/**
 * Rend des places de compte prises pour rien : la place globale a été refusée
 * juste après, rien n'a été émis.
 */
export async function rendrePlacesDeCompte(
  userId: string,
  places = 1,
  maintenant: Date = new Date(),
): Promise<void> {
  await prisma.aiUserQuota.updateMany({
    where: { userId, day: dayToUtcDate(jourUtc(maintenant)), reserved: { gte: places } },
    data: { reserved: { decrement: places } },
  });
}

export async function lirePlacesDeCompte(
  userId: string,
  maintenant: Date = new Date(),
): Promise<number> {
  const lignes = await prisma.$queryRaw<{ reserved: number }[]>`
    SELECT "reserved" FROM "AiUserQuota"
    WHERE "userId" = ${userId} AND "day" = ${jourUtc(maintenant)}::date
  `;

  return lignes[0]?.reserved ?? 0;
}

/** Places déjà prises aujourd'hui. Pour l'observation et les messages d'erreur. */
export async function lireReservationsDuJour(maintenant: Date = new Date()): Promise<number> {
  const lignes = await prisma.$queryRaw<{ reserved: number }[]>`
    SELECT "reserved" FROM "AiCallQuota" WHERE "day" = ${jourUtc(maintenant)}::date
  `;

  return lignes[0]?.reserved ?? 0;
}
