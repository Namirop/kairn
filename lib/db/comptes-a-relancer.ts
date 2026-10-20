import { prisma } from "@/lib/db/client";
import { JOURS_APRES_LESQUELS_ON_RENONCE } from "@/lib/domain/relance-du-compte-vide";

/** De quoi adresser la relance et juger l'heure. */
export type CandidatALaRelance = {
  userId: string;
  timezone: string;
  dailyReminderHour: number;
  inscritLe: Date;
};

/**
 * Jamais rien déposé, jamais relancés ; l'heure locale reste à
 * `estLHeureDeLaRelance`. Un dépôt rejeté ou en échec compte : à qui a buté,
 * « rien n'est encore déposé » serait faux. La borne sur `createdAt` évite de
 * parcourir la table ; son jour de marge couvre tous les fuseaux.
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
