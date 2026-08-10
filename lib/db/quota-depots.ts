import { prisma } from "@/lib/db/client";
import { localDay } from "@/lib/domain/local-day";

/**
 * Deux limites, deux rôles.
 *
 * Le quota du jour protège le budget : cinq dépôts par personne et par journée,
 * comptés dans le calendrier de l'utilisateur — c'est son minuit qui remet le
 * compteur à zéro, pas celui d'un serveur.
 *
 * La limite de débit protège le serveur : elle borne les dépôts rapprochés,
 * indépendamment du quota. Elle se lit sur les dépôts eux-mêmes, sans table de
 * plus : ce qui compte est déjà écrit.
 */

export const DEPOTS_PAR_JOUR = 5;

/** Fenêtre courte du débit, et ce qu'on y tolère. */
const FENETRE_DEBIT_MS = 60 * 1000;
const DEPOTS_PAR_FENETRE = 3;

export type Autorisation =
  | { accorde: true; restants: number }
  | { accorde: false; motif: "quota" | "debit"; restants: number };

function jourLocal(instant: Date, fuseau: string): Date {
  return new Date(`${localDay(instant, fuseau)}T00:00:00.000Z`);
}

export async function compterDepotsDuJour(
  userId: string,
  fuseau: string,
  maintenant: Date = new Date(),
): Promise<number> {
  const usage = await prisma.dailyUsage.findUnique({
    where: { userId_day: { userId, day: jourLocal(maintenant, fuseau) } },
  });

  return usage?.generations ?? 0;
}

/**
 * Prend une place du jour, ou la refuse. L'incrément et le refus tiennent dans
 * une seule instruction : deux dépôts simultanés ne peuvent pas prendre la
 * même place.
 */
export async function reserverDepot(
  userId: string,
  fuseau: string,
  maintenant: Date = new Date(),
): Promise<Autorisation> {
  const recents = await prisma.input.count({
    where: { userId, createdAt: { gte: new Date(maintenant.getTime() - FENETRE_DEBIT_MS) } },
  });

  if (recents >= DEPOTS_PAR_FENETRE) {
    return { accorde: false, motif: "debit", restants: 0 };
  }

  const jour = localDay(maintenant, fuseau);
  const lignes = await prisma.$queryRaw<{ generations: number }[]>`
    INSERT INTO "DailyUsage" ("userId", "day", "generations", "reviews", "createdAt", "updatedAt")
    VALUES (${userId}, ${jour}::date, 1, 0, now(), now())
    ON CONFLICT ("userId", "day") DO UPDATE
      SET "generations" = "DailyUsage"."generations" + 1,
          "updatedAt" = now()
      WHERE "DailyUsage"."generations" < ${DEPOTS_PAR_JOUR}
    RETURNING "generations"
  `;

  const prise = lignes[0];

  if (!prise) {
    return { accorde: false, motif: "quota", restants: 0 };
  }

  return { accorde: true, restants: Math.max(0, DEPOTS_PAR_JOUR - prise.generations) };
}

/** Le dépôt n'a finalement pas été écrit : sa place retourne au compteur. */
export async function rendreDepot(
  userId: string,
  fuseau: string,
  maintenant: Date = new Date(),
): Promise<void> {
  await prisma.dailyUsage.updateMany({
    where: { userId, day: jourLocal(maintenant, fuseau), generations: { gt: 0 } },
    data: { generations: { decrement: 1 } },
  });
}

export async function inscrireEnListeDattente(userId: string, motif?: string): Promise<void> {
  await prisma.waitlistEntry.upsert({
    where: { userId },
    create: { userId, motif: motif ?? null },
    update: { motif: motif ?? null },
  });
}

export async function estEnListeDattente(userId: string): Promise<boolean> {
  return (await prisma.waitlistEntry.count({ where: { userId } })) > 0;
}
