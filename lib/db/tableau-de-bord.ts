import { suivreLArriere, type ArriereSuivi } from "@/lib/db/arriere-de-revision";
import { prisma } from "@/lib/db/client";
import { listerDepots } from "@/lib/db/depots";
import { compterDusAujourdhui } from "@/lib/db/session-du-jour";
import { lireCadreDeSession } from "@/lib/db/user-settings";
import { chargeDuJour, type ChargeDuJour } from "@/lib/domain/selection-session";
import type { UserStats } from "@/lib/db/types";
import type { DepotListe } from "@/lib/db/depots";

/**
 * Une seule lecture pour tout le tableau de bord. Les requêtes partent
 * ensemble : la page ne rend rien tant qu'elle n'a pas tout, autant ne pas les
 * enchaîner.
 */

export type TableauDeBord = {
  /** Ce que la session servira maintenant, et ce qu'elle reporte à demain. */
  charge: ChargeDuJour;
  /** Fuseau de l'utilisateur : toute échéance se lit dans son calendrier. */
  fuseau: string;
  stats: UserStats | null;
  /** Identifiants des Atoms consolidés : une pierre chacun. */
  grainesDuCairn: string[];
  depots: DepotListe[];
  totalAtoms: number;
  /** L'arriéré, et depuis quand. Ce qui décide si on le dit, et comment. */
  arriere: ArriereSuivi;
  /** Des concepts existent mais aucun ne porte encore de question. */
  questionsEnRoute: boolean;
};

export async function lireTableauDeBord(
  userId: string,
  maintenant: Date = new Date(),
): Promise<TableauDeBord> {
  const [dusAujourdhui, cadre, stats, consolides, depots, totalAtoms, sansQuestions] =
    await Promise.all([
      // Le même compte que celui de la session, et pas un compte parallèle : les
      // deux avaient divergé, l'accueil promettant cinq concepts là où la session
      // répondait « tu es à jour ». « Est dû » n'a qu'un seul endroit où vivre.
      compterDusAujourdhui(userId, maintenant),
      lireCadreDeSession(userId),
      prisma.userStats.findUnique({ where: { userId } }),
      prisma.atom.findMany({
        where: { userId, state: "CONSOLIDATED" },
        orderBy: { updatedAt: "asc" },
        select: { id: true },
      }),
      listerDepots(userId, 3),
      prisma.atom.count({ where: { userId } }),
      prisma.atom.count({ where: { userId, uncertain: false, variants: { none: {} } } }),
    ]);

  const charge = chargeDuJour(dusAujourdhui, cadre.plafond);
  const arriere = await suivreLArriere(userId, charge.enAttente > 0, cadre.fuseau, maintenant);

  return {
    charge,
    fuseau: cadre.fuseau,
    stats,
    grainesDuCairn: consolides.map((atom) => atom.id),
    totalAtoms,
    depots,
    arriere,
    // Des concepts sans une seule question : le troisième écran vide, celui où
    // il n'y a rien à faire mais où rien n'est en panne non plus.
    questionsEnRoute: totalAtoms > 0 && sansQuestions > 0,
  };
}
