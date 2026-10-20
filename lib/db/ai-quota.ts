import { prisma } from "@/lib/db/client";
import { jourEnDateUtc, jourLocal } from "@/lib/domain/jour-local";

/**
 * Places d'appel modèle du jour. Incrément et refus en une instruction (lu puis
 * écrit, un compteur laisse passer deux appels) : si le `WHERE` du `DO UPDATE`
 * est faux, `RETURNING` ne rend rien, et ce rien vaut refus. La place globale
 * n'est jamais rendue : un appel qui échoue a pu consommer des tokens.
 */

export type Reservation = {
  obtenue: boolean;
  /** Places consommées après l'opération, ou déjà consommées en cas de refus. */
  utilisees: number;
};

/** Plafond global au produit : la journée se compte en UTC. */
function jourUtc(instant: Date): string {
  return jourLocal(instant, "UTC");
}

export async function reserverAppelModele(
  plafond: number,
  maintenant: Date = new Date(),
): Promise<Reservation> {
  // Le `WHERE` ne garde que le `DO UPDATE` : la première insertion du jour
  // échappe au plafond, qui à zéro doit pourtant tout refuser.
  if (plafond < 1) {
    return { obtenue: false, utilisees: await lireReservationsDuJour(maintenant) };
  }

  const jour = jourUtc(maintenant);
  const lignes = await prisma.$queryRaw<{ reserved: number }[]>`
    INSERT INTO "AiCallQuota" ("day", "reserved", "createdAt", "updatedAt")
    VALUES (${jour}::date, 1, now(), now())
    ON CONFLICT ("day") DO UPDATE
      SET "reserved" = "AiCallQuota"."reserved" + 1,
          "updatedAt" = now()
      WHERE "AiCallQuota"."reserved" + 1 <= ${plafond}
    RETURNING "reserved"
  `;

  const obtenue = lignes[0];

  if (obtenue) return { obtenue: true, utilisees: obtenue.reserved };

  return { obtenue: false, utilisees: await lireReservationsDuJour(maintenant) };
}

/**
 * Le plafond global ne protège pas un compte de son voisin, qui fermerait la
 * journée de tous. Pris **avant** la place globale, en UTC comme elle pour que
 * les deux fenêtres ferment au même instant.
 */
export async function reserverPlaceDeCompte(
  userId: string,
  plafond: number,
  maintenant: Date = new Date(),
): Promise<Reservation> {
  // Même garde que le plafond global.
  if (plafond < 1) {
    return { obtenue: false, utilisees: await lirePlacesDeCompte(userId, maintenant) };
  }

  const jour = jourUtc(maintenant);
  const lignes = await prisma.$queryRaw<{ reserved: number }[]>`
    INSERT INTO "AiUserQuota" ("userId", "day", "reserved", "createdAt", "updatedAt")
    VALUES (${userId}, ${jour}::date, 1, now(), now())
    ON CONFLICT ("userId", "day") DO UPDATE
      SET "reserved" = "AiUserQuota"."reserved" + 1,
          "updatedAt" = now()
      WHERE "AiUserQuota"."reserved" + 1 <= ${plafond}
    RETURNING "reserved"
  `;

  const obtenue = lignes[0];

  if (obtenue) return { obtenue: true, utilisees: obtenue.reserved };

  return { obtenue: false, utilisees: await lirePlacesDeCompte(userId, maintenant) };
}

/**
 * Un seul seau pour tous les visiteurs : borne ce que la landing prend au
 * produit. La répartition entre eux relève de `VISITES_PAR_ADRESSE`.
 */
export async function reserverPlaceAnonyme(
  plafond: number,
  maintenant: Date = new Date(),
): Promise<Reservation> {
  // Même garde que le plafond global.
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

/** Prise pour rien : la place globale a été refusée juste après, rien n'est parti. */
export async function rendrePlaceAnonyme(maintenant: Date = new Date()): Promise<void> {
  await prisma.aiAnonymousQuota.updateMany({
    where: { day: jourEnDateUtc(jourUtc(maintenant)), reserved: { gte: 1 } },
    data: { reserved: { decrement: 1 } },
  });
}

export async function lirePlacesAnonymes(maintenant: Date = new Date()): Promise<number> {
  const lignes = await prisma.$queryRaw<{ reserved: number }[]>`
    SELECT "reserved" FROM "AiAnonymousQuota" WHERE "day" = ${jourUtc(maintenant)}::date
  `;

  return lignes[0]?.reserved ?? 0;
}

/** Prises pour rien : la place globale a été refusée juste après, rien n'est parti. */
export async function rendrePlacesDeCompte(
  userId: string,
  places = 1,
  maintenant: Date = new Date(),
): Promise<void> {
  await prisma.aiUserQuota.updateMany({
    where: { userId, day: jourEnDateUtc(jourUtc(maintenant)), reserved: { gte: places } },
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

/** Pour l'observation et les messages d'erreur. */
export async function lireReservationsDuJour(maintenant: Date = new Date()): Promise<number> {
  const lignes = await prisma.$queryRaw<{ reserved: number }[]>`
    SELECT "reserved" FROM "AiCallQuota" WHERE "day" = ${jourUtc(maintenant)}::date
  `;

  return lignes[0]?.reserved ?? 0;
}
