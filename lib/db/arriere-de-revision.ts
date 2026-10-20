import { prisma } from "@/lib/db/client";
import {
  doitSignalerLaDette,
  joursDArriere,
  suiviApresObservation,
  type SuiviDeLArriere,
} from "@/lib/domain/dette-de-revision";
import { jourEnDateUtc, jourLocal } from "@/lib/domain/jour-local";

/**
 * Seul un arriéré qui dure compte, et son premier jour ne se déduit pas des
 * échéances, que les révisions déplacent : il s'écrit, à la lecture du tableau
 * de bord (seul à le regarder) et seulement quand l'état change.
 */
export type ArriereSuivi = {
  /** Assez long pour qu'on le dise. */
  signaler: boolean;
  /** Aujourd'hui compris ; zéro sans arriéré. */
  jours: number;
};

export async function suivreLArriere(
  userId: string,
  enArriere: boolean,
  fuseau: string,
  maintenant: Date = new Date(),
): Promise<ArriereSuivi> {
  const jour = jourLocal(maintenant, fuseau);
  const stats = await prisma.userStats.findUnique({
    where: { userId },
    select: { backlogSince: true },
  });

  // `ouvrirLeCompte` crée la ligne ; absente, rien à suivre, et pas à créer ici.
  if (!stats) return { signaler: false, jours: 0 };

  const avant: SuiviDeLArriere = {
    depuis: stats.backlogSince ? stats.backlogSince.toISOString().slice(0, 10) : null,
  };
  const apres = suiviApresObservation(avant, enArriere, jour);

  if (apres.depuis !== avant.depuis) {
    await prisma.userStats.update({
      where: { userId },
      data: { backlogSince: apres.depuis ? jourEnDateUtc(apres.depuis) : null },
    });
  }

  return {
    signaler: doitSignalerLaDette(apres, enArriere, jour),
    jours: enArriere ? joursDArriere(apres, jour) : 0,
  };
}
