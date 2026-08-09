import { prisma } from "@/lib/db/client";
import type { DepotRecent } from "@/lib/db/tableau-de-bord";

const APERCU = 220;

/** Tout ce que l'utilisateur a déposé, du plus récent au plus ancien. */
export async function listerDepots(userId: string, limite = 50): Promise<DepotRecent[]> {
  const lignes = await prisma.input.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limite,
    select: {
      id: true,
      rawContent: true,
      sourceType: true,
      status: true,
      createdAt: true,
      _count: { select: { atoms: true } },
    },
  });

  return lignes.map((ligne) => ({
    id: ligne.id,
    apercu: ligne.rawContent.slice(0, APERCU).trim(),
    sourceType: ligne.sourceType,
    status: ligne.status,
    createdAt: ligne.createdAt,
    nombreAtoms: ligne._count.atoms,
  }));
}
