import { prisma } from "@/lib/db/client";
import { dayToUtcDate, localDay } from "@/lib/domain/local-day";

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

  // La clause `WHERE` ci-dessous ne garde que le `DO UPDATE` : sur la première
  // réservation d'une journée, l'insertion passe sans être confrontée au
  // plafond. Un lot plus gros que le plafond, soumis juste après minuit UTC,
  // s'installerait donc entier. La demande d'une seule place ne pouvait pas se
  // tromper, un nombre variable si.
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
 * Le plafond global protège le budget ; il ne protège personne de son voisin.
 * Un compte qui le consommait entièrement fermait la journée de tous les
 * autres, et il n'avait pas besoin d'être malveillant pour ça. Cette réserve
 * est le second verrou, pris **avant** la place globale.
 *
 * Même instruction, même raison qu'au-dessus : incrémenter et refuser d'un
 * seul mouvement. La journée se compte en UTC, comme le plafond global — deux
 * fenêtres qui se ferment à des instants différents dérivent l'une de l'autre.
 */
export async function reserverPlacesDeCompte(
  userId: string,
  plafond: number,
  places: number,
  maintenant: Date = new Date(),
): Promise<Reservation> {
  // Même garde que pour le plafond global : la clause `WHERE` ne tient que le
  // `DO UPDATE`, donc la première réservation d'une journée passerait sans être
  // confrontée au plafond.
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
 * Un seul seau pour tous les visiteurs, et pas un par empreinte : ce qu'on
 * borne ici est ce que la landing peut prendre au produit, pas ce qu'un
 * visiteur peut prendre aux autres — cette répartition-là est le travail de
 * `VISITES_PAR_ADRESSE`, et elle se joue avant l'appel.
 *
 * Même instruction que les deux autres compteurs, même raison : incrémenter et
 * refuser d'un seul mouvement, sinon deux essais simultanés lisent la même
 * valeur et passent tous les deux.
 */
export async function reserverPlaceAnonyme(
  plafond: number,
  maintenant: Date = new Date(),
): Promise<Reservation> {
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
 * Rend une place anonyme prise pour rien.
 *
 * Même cas unique que pour la part d'un compte : la place globale a été refusée
 * juste après, donc rien n'a été émis et rien n'est dû.
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
 * Rend des places de compte prises pour rien.
 *
 * Le seul cas : la place globale a été refusée juste après. Contrairement à la
 * place globale, celles-ci n'ont rien émis — rien n'a été consommé, rien n'est
 * dû.
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
