import { prisma } from "@/lib/db/client";
import { listerDepots } from "@/lib/db/depots";
import { compterDusAujourdhui } from "@/lib/db/session-du-jour";
import { lireFuseauUtilisateur } from "@/lib/db/user-settings";
import type { UserStats } from "@/lib/db/types";
import type { DepotListe } from "@/lib/db/depots";

/**
 * Une seule lecture pour tout le tableau de bord. Les requêtes partent
 * ensemble : la page ne rend rien tant qu'elle n'a pas tout, autant ne pas les
 * enchaîner.
 */

export type TableauDeBord = {
  dusAujourdhui: number;
  /** Fuseau de l'utilisateur : toute échéance se lit dans son calendrier. */
  fuseau: string;
  stats: UserStats | null;
  /** Identifiants des Atoms consolidés : une pierre chacun. */
  grainesDuCairn: string[];
  depots: DepotListe[];
  totalAtoms: number;
};

export async function lireTableauDeBord(
  userId: string,
  maintenant: Date = new Date(),
): Promise<TableauDeBord> {
  const [dusAujourdhui, fuseau, stats, consolides, depots, totalAtoms] = await Promise.all([
    // Le même compte que celui de la session, et pas un compte parallèle : les
    // deux avaient divergé, l'accueil promettant cinq concepts là où la session
    // répondait « tu es à jour ». « Est dû » n'a qu'un seul endroit où vivre.
    compterDusAujourdhui(userId, maintenant),
    lireFuseauUtilisateur(userId),
    prisma.userStats.findUnique({ where: { userId } }),
    prisma.atom.findMany({
      where: { userId, state: "CONSOLIDATED" },
      orderBy: { updatedAt: "asc" },
      select: { id: true },
    }),
    listerDepots(userId, 3),
    prisma.atom.count({ where: { userId } }),
  ]);

  return {
    dusAujourdhui,
    fuseau,
    stats,
    grainesDuCairn: consolides.map((atom) => atom.id),
    totalAtoms,
    depots,
  };
}
