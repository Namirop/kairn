import { prisma } from "@/lib/db/client";
import { ETATS_QUI_POSENT_UNE_PIERRE } from "@/lib/domain/etat-maitrise";

/**
 * La hauteur du cairn, remise d'accord avec les concepts.
 *
 * `UserStats.atomsConsolidated` était recompté au seul endroit qui le faisait
 * bouger jusqu'ici : la fin d'un passage de session. C'était vrai tant que
 * l'état d'un concept ne changeait que là. Ça ne l'est plus — réécrire un
 * concept le renvoie en apprentissage, le sortir du cycle lui fait poser une
 * pierre, le remettre en révision la lui reprend, et le supprimer emporte la
 * sienne. Aucun de ces gestes ne passe par la session.
 *
 * Le tableau de bord lit ce compteur pour le **nombre** de pierres et relit les
 * concepts pour leurs **formes** : quand les deux ne disent plus la même chose,
 * le cairn dessine une pierre de plus que ce que le compte porte, avec une forme
 * tirée d'un identifiant par défaut. Rien n'est perdu, mais le dessin ment
 * jusqu'à la prochaine session.
 *
 * On recompte plutôt qu'on n'incrémente, comme `compterLePassage` : un concept
 * entre et sort de l'état qui pose une pierre, et un compteur qui dérive d'un
 * seul point de vue finit toujours par mentir sur la hauteur du cairn.
 *
 * Ne crée pas la ligne si elle n'existe pas. Un compte qui n'a jamais révisé n'a
 * pas de statistiques, et le tableau de bord lit alors zéro — ce qui est juste,
 * puisqu'aucune de ses pierres ne peut avoir été posée par une session.
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
