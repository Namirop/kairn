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

/**
 * Réserve `places` d'un coup, ou aucune.
 *
 * Un envoi groupé consomme autant de places qu'il porte de requêtes : c'est le
 * même budget, la même journée, seul le tarif change. Le tout ou rien évite un
 * lot amputé de la moitié de ses requêtes.
 */
export async function reserverAppelsModele(
  plafond: number,
  places: number,
  maintenant: Date = new Date(),
): Promise<Reservation> {
  const jour = jourUtc(maintenant);

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

/** Places déjà prises aujourd'hui. Pour l'observation et les messages d'erreur. */
export async function lireReservationsDuJour(maintenant: Date = new Date()): Promise<number> {
  const lignes = await prisma.$queryRaw<{ reserved: number }[]>`
    SELECT "reserved" FROM "AiCallQuota" WHERE "day" = ${jourUtc(maintenant)}::date
  `;

  return lignes[0]?.reserved ?? 0;
}
