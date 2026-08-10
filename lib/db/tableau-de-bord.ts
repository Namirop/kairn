import { prisma } from "@/lib/db/client";
import { listerDepots } from "@/lib/db/depots";
import { lireFuseauUtilisateur } from "@/lib/db/user-settings";
import type { AtomState, UserStats } from "@/lib/db/types";
import type { DepotListe } from "@/lib/db/depots";

/**
 * Une seule lecture pour tout le tableau de bord. Les requêtes partent
 * ensemble : la page ne rend rien tant qu'elle n'a pas tout, autant ne pas les
 * enchaîner.
 */

export type AtomEnCours = {
  id: string;
  concept: string;
  due: Date;
  state: AtomState;
};

export type TableauDeBord = {
  dusAujourdhui: number;
  /** Fuseau de l'utilisateur : toute échéance se lit dans son calendrier. */
  fuseau: string;
  stats: UserStats | null;
  /** Identifiants des Atoms consolidés : une pierre chacun. */
  grainesDuCairn: string[];
  enCours: AtomEnCours[];
  depots: DepotListe[];
  totalAtoms: number;
};

export async function lireTableauDeBord(
  userId: string,
  maintenant: Date = new Date(),
): Promise<TableauDeBord> {
  const [dusAujourdhui, fuseau, stats, consolides, enCours, depots, totalAtoms] = await Promise.all(
    [
      prisma.atom.count({
        where: { userId, due: { lte: maintenant }, state: { notIn: ["ARCHIVED", "CONSOLIDATED"] } },
      }),
      lireFuseauUtilisateur(userId),
      prisma.userStats.findUnique({ where: { userId } }),
      prisma.atom.findMany({
        where: { userId, state: "CONSOLIDATED" },
        orderBy: { updatedAt: "asc" },
        select: { id: true },
      }),
      prisma.atom.findMany({
        where: { userId, state: { in: ["LEARNING", "REVIEWING"] } },
        orderBy: { due: "asc" },
        take: 4,
        select: { id: true, concept: true, due: true, state: true },
      }),
      listerDepots(userId, 3),
      prisma.atom.count({ where: { userId } }),
    ],
  );

  return {
    dusAujourdhui,
    fuseau,
    stats,
    grainesDuCairn: consolides.map((atom) => atom.id),
    enCours,
    totalAtoms,
    depots,
  };
}
