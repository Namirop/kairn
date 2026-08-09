import { prisma } from "@/lib/db/client";
import { localDay } from "@/lib/domain/local-day";

/**
 * Réservation d'une place d'appel modèle pour la journée en cours.
 *
 * Lire un compteur puis l'écrire laisse une fenêtre entre les deux : deux
 * appels simultanés lisent la même valeur et passent tous les deux. Ici,
 * l'incrément et le refus tiennent dans une seule instruction. Quand la clause
 * `WHERE` du `DO UPDATE` est fausse, la commande ne touche aucune ligne et
 * `RETURNING` ne rend rien — c'est ce « rien » qui vaut refus.
 *
 * La place n'est jamais rendue : un appel qui part et échoue a pu consommer des
 * tokens, il consomme donc sa place.
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

export async function reserverAppelModele(
  plafond: number,
  maintenant: Date = new Date(),
): Promise<Reservation> {
  const jour = jourUtc(maintenant);

  const lignes = await prisma.$queryRaw<{ reserved: number }[]>`
    INSERT INTO "AiCallQuota" ("day", "reserved", "createdAt", "updatedAt")
    VALUES (${jour}::date, 1, now(), now())
    ON CONFLICT ("day") DO UPDATE
      SET "reserved" = "AiCallQuota"."reserved" + 1,
          "updatedAt" = now()
      WHERE "AiCallQuota"."reserved" < ${plafond}
    RETURNING "reserved"
  `;

  const obtenue = lignes[0];

  if (obtenue) {
    return { obtenue: true, utilisees: obtenue.reserved };
  }

  return { obtenue: false, utilisees: await lireReservationsDuJour(maintenant) };
}

/** Places déjà prises aujourd'hui. Pour l'observation et les messages d'erreur. */
export async function lireReservationsDuJour(maintenant: Date = new Date()): Promise<number> {
  const lignes = await prisma.$queryRaw<{ reserved: number }[]>`
    SELECT "reserved" FROM "AiCallQuota" WHERE "day" = ${jourUtc(maintenant)}::date
  `;

  return lignes[0]?.reserved ?? 0;
}
