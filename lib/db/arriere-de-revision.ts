import { prisma } from "@/lib/db/client";
import {
  doitSignalerLaDette,
  suiviApresObservation,
  type SuiviDeLArriere,
} from "@/lib/domain/dette-de-revision";
import { dayToUtcDate, localDay } from "@/lib/domain/local-day";

/**
 * Le suivi de l'arriéré, d'un jour à l'autre.
 *
 * Un arriéré qui dépasse le plafond de session un jour ne veut rien dire ; le
 * même plusieurs jours de suite veut dire que le rythme de dépôt et le rythme de
 * révision ne se rejoindront pas tout seuls. Pour le savoir il faut se souvenir
 * du jour où ça a commencé, et ce jour-là ne se déduit d'aucune autre donnée :
 * on ne peut pas reconstruire l'arriéré d'hier à partir des échéances
 * d'aujourd'hui, parce que les révisions les ont déplacées.
 *
 * D'où cette écriture au fil de la lecture du tableau de bord, qui est le seul
 * endroit où l'on regarde l'arriéré. Elle est conditionnelle : elle ne part que
 * quand l'état change — l'arriéré s'installe, ou il se résorbe. Un arriéré qui
 * dure ne réécrit rien, donc la très grande majorité des affichages ne font
 * qu'une lecture.
 */
export async function suivreLArriere(
  userId: string,
  enArriere: boolean,
  fuseau: string,
  maintenant: Date = new Date(),
): Promise<boolean> {
  const jour = localDay(maintenant, fuseau);
  const stats = await prisma.userStats.findUnique({
    where: { userId },
    select: { backlogSince: true },
  });

  // Aucune ligne de statistiques : le compte n'a jamais révisé, il n'a pas
  // d'arriéré à raconter. On ne crée pas la ligne pour y écrire un vide.
  if (!stats) return false;

  const avant: SuiviDeLArriere = {
    depuis: stats.backlogSince ? stats.backlogSince.toISOString().slice(0, 10) : null,
  };
  const apres = suiviApresObservation(avant, enArriere, jour);

  if (apres.depuis !== avant.depuis) {
    await prisma.userStats.update({
      where: { userId },
      data: { backlogSince: apres.depuis ? dayToUtcDate(apres.depuis) : null },
    });
  }

  return doitSignalerLaDette(apres, enArriere, jour);
}
