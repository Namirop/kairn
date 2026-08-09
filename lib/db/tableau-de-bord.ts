import { prisma } from "@/lib/db/client";
import type { AtomState, InputSourceType, InputStatus, UserStats } from "@/lib/db/types";

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

export type DepotRecent = {
  id: string;
  apercu: string;
  sourceType: InputSourceType;
  status: InputStatus;
  createdAt: Date;
  nombreAtoms: number;
};

export type TableauDeBord = {
  dusAujourdhui: number;
  stats: UserStats | null;
  /** Identifiants des Atoms consolidés : une pierre chacun. */
  grainesDuCairn: string[];
  enCours: AtomEnCours[];
  depots: DepotRecent[];
  totalAtoms: number;
};

const APERCU = 110;

export async function lireTableauDeBord(
  userId: string,
  maintenant: Date = new Date(),
): Promise<TableauDeBord> {
  const [dusAujourdhui, stats, consolides, enCours, depots, totalAtoms] = await Promise.all([
    prisma.atom.count({
      where: { userId, due: { lte: maintenant }, state: { notIn: ["ARCHIVED", "CONSOLIDATED"] } },
    }),
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
    prisma.input.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 3,
      select: {
        id: true,
        rawContent: true,
        sourceType: true,
        status: true,
        createdAt: true,
        _count: { select: { atoms: true } },
      },
    }),
    prisma.atom.count({ where: { userId } }),
  ]);

  return {
    dusAujourdhui,
    stats,
    grainesDuCairn: consolides.map((atom) => atom.id),
    enCours,
    totalAtoms,
    depots: depots.map((depot) => ({
      id: depot.id,
      apercu: depot.rawContent.slice(0, APERCU).trim(),
      sourceType: depot.sourceType,
      status: depot.status,
      createdAt: depot.createdAt,
      nombreAtoms: depot._count.atoms,
    })),
  };
}
