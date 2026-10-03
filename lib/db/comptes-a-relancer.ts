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
 * **Trois filtres, et c'est SQL qui les applique**, parce qu'ils portent tous
 * sur des ensembles : aucun `Input`, aucune relance déjà écrite, et une
 * inscription assez récente. L'heure locale, elle, ne se compare pas en SQL —
 * elle dépend du fuseau de chacun — et reste à `estLHeureDeLaRelance`.
 *
 * **`inputs: { none: {} }` et non un compteur à zéro.** Un dépôt rejeté ou en
 * échec reste un `Input` : quelqu'un qui a essayé et dont le dépôt n'a rien
 * donné n'est pas quelqu'un qui n'a jamais essayé, et lui écrire « rien n'est
 * encore déposé » serait faux. La relance s'adresse à qui n'a pas franchi le
 * pas, pas à qui a buté.
 *
 * **La borne basse se lit sur `createdAt`**, pas sur un jour local : elle ne
 * sert qu'à empêcher la requête de parcourir toute la table, et une marge d'un
 * jour couvre tous les fuseaux. Le jugement exact revient à la fonction pure.
 */
export async function findComptesARelancer(
  maintenant: Date,
  limit = 500,
): Promise<CandidatALaRelance[]> {
  const borne = new Date(
    maintenant.getTime() - (JOURS_APRES_LESQUELS_ON_RENONCE + 1) * 24 * 60 * 60 * 1000,
  );

  const rows = await prisma.userSettings.findMany({
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

  return rows.map((row) => ({
    userId: row.userId,
    timezone: row.timezone,
    dailyReminderHour: row.dailyReminderHour,
    inscritLe: row.user.createdAt,
  }));
}
