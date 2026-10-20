import { prisma } from "@/lib/db/client";
import { ETATS_QUI_POSENT_UNE_PIERRE } from "@/lib/domain/etat-maitrise";

/**
 * À appeler après tout geste hors session qui change l'état d'un concept : le
 * tableau de bord lit `atomsConsolidated` pour le nombre de pierres et les concepts
 * pour leurs formes, un écart dessinerait une pierre de trop. Recompté, comme
 * dans `compterLePassage`. Sans ligne, rien à créer : le tableau lit zéro.
 */
export async function recompterLesPierres(userId: string): Promise<number> {
  const pierres = await prisma.atom.count({
    where: { userId, state: { in: ETATS_QUI_POSENT_UNE_PIERRE } },
  });

  await prisma.userStats.updateMany({
    where: { userId },
    data: { atomsConsolidated: pierres },
  });

  return pierres;
}
