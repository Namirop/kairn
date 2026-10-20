import { suivreLArriere, type ArriereSuivi } from "@/lib/db/arriere-de-revision";
import { prisma } from "@/lib/db/client";
import { listerDepots } from "@/lib/db/depots";
import { lireChargeDuJour } from "@/lib/db/session-du-jour";
import { ETATS_QUI_POSENT_UNE_PIERRE } from "@/lib/domain/etat-maitrise";
import type { ChargeDuJour } from "@/lib/domain/selection-session";
import type { UserStats } from "@/lib/db/types";
import type { DepotListe } from "@/lib/db/depots";

/** Une seule lecture pour tout le tableau de bord, requêtes en parallèle. */

export type TableauDeBord = {
  /** Ce que la session sert maintenant et ce qu'elle reporte. */
  charge: ChargeDuJour;
  /** Toute échéance se lit dans le calendrier de l'utilisateur. */
  fuseau: string;
  stats: UserStats | null;
  /** Une pierre par Atom consolidé. */
  grainesDuCairn: string[];
  depots: DepotListe[];
  totalAtoms: number;
  /** Et depuis quand : décide si on le dit, et comment. */
  arriere: ArriereSuivi;
  /** Un nombre, pas un drapeau : il explique une session plus courte que prévu. */
  conceptsSansQuestions: number;
  /** Avec `faitsAujourdhui`, dit pourquoi des concepts attendent. */
  plafond: number;
  faitsAujourdhui: number;
};

export async function lireTableauDeBord(
  userId: string,
  maintenant: Date = new Date(),
): Promise<TableauDeBord> {
  const [duJour, stats, consolides, depots, totalAtoms, sansQuestions] = await Promise.all([
    // Le même compte que la session : « dû » n'a qu'une définition.
    lireChargeDuJour(userId, maintenant),
    prisma.userStats.findUnique({ where: { userId } }),
    prisma.atom.findMany({
      where: { userId, state: { in: ETATS_QUI_POSENT_UNE_PIERRE } },
      orderBy: { updatedAt: "asc" },
      select: { id: true },
    }),
    listerDepots(userId, 3),
    prisma.atom.count({ where: { userId } }),
    prisma.atom.count({ where: { userId, uncertain: false, variants: { none: {} } } }),
  ]);

  const { charge, plafond, faitsAujourdhui, fuseau } = duJour;
  const arriere = await suivreLArriere(userId, charge.enAttente > 0, fuseau, maintenant);

  return {
    charge,
    fuseau,
    stats,
    grainesDuCairn: consolides.map((atom) => atom.id),
    totalAtoms,
    depots,
    arriere,
    conceptsSansQuestions: sansQuestions,
    plafond,
    faitsAujourdhui,
  };
}
