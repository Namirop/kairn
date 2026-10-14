import { prisma } from "@/lib/db/client";
import { JOURS_APRES_LESQUELS_ON_RENONCE } from "@/lib/domain/relance-du-compte-vide";

/** Ce dont la relance a besoin pour être adressée, et pour que l'heure soit jugée. */
export type CandidatALaRelance = {
  userId: string;
  timezone: string;
  dailyReminderHour: number;
  inscritLe: Date;
};

/**
 * Les comptes qui n'ont jamais rien déposé et qu'on n'a jamais relancés.
 *
 * L'heure locale dépend du fuseau de chacun : elle reste à
 * `estLHeureDeLaRelance`.
 *
 * `inputs: { none: {} }` compte aussi les dépôts rejetés ou en échec : qui a
 * essayé et buté n'est pas qui n'a jamais essayé, et lui écrire « rien n'est
 * encore déposé » serait faux.
 *
 * La borne sur `createdAt` ne sert qu'à ne pas parcourir toute la table ; le
 * jour de marge couvre tous les fuseaux, le jugement exact revient à la
 * fonction pure.
 */
export async function trouverLesComptesARelancer(
  maintenant: Date,
  limit = 500,
): Promise<CandidatALaRelance[]> {
  const borne = new Date(
    maintenant.getTime() - (JOURS_APRES_LESQUELS_ON_RENONCE + 1) * 24 * 60 * 60 * 1000,
  );

  const lignes = await prisma.userSettings.findMany({
    where: {
      emailOptOutAt: null,
      user: {
        createdAt: { gte: borne },
        inputs: { none: {} },
        emailsSent: { none: { type: "RELANCE_COMPTE_VIDE" } },
      },
    },
    select: {
      userId: true,
      timezone: true,
      dailyReminderHour: true,
      user: { select: { createdAt: true } },
    },
    take: limit,
  });

  return lignes.map((ligne) => ({
    userId: ligne.userId,
    timezone: ligne.timezone,
    dailyReminderHour: ligne.dailyReminderHour,
    inscritLe: ligne.user.createdAt,
  }));
}
