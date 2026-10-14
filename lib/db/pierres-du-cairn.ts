import { prisma } from "@/lib/db/client";
import { ETATS_QUI_POSENT_UNE_PIERRE } from "@/lib/domain/etat-maitrise";

/**
 * La hauteur du cairn (`UserStats.atomsConsolidated`), remise d'accord avec les
 * concepts. À appeler après tout geste hors session qui change l'état d'un
 * concept (réécrire, sortir du cycle, remettre en révision, supprimer) : le
 * tableau de bord lit ce compteur pour le nombre de pierres et les concepts
 * pour leurs formes, et un écart fait dessiner une pierre de trop.
 *
 * On recompte plutôt qu'on n'incrémente, comme `compterLePassage` : un concept
 * entre et sort de l'état qui pose une pierre.
 *
 * Ne crée pas la ligne : un compte qui n'a jamais révisé n'a pas de
 * statistiques, et le tableau de bord lit alors zéro.
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
