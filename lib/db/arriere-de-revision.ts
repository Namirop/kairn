import { prisma } from "@/lib/db/client";
import {
  doitSignalerLaDette,
  joursDArriere,
  suiviApresObservation,
  type SuiviDeLArriere,
} from "@/lib/domain/dette-de-revision";
import { jourEnDateUtc, jourLocal } from "@/lib/domain/jour-local";

/**
 * Le suivi de l'arriéré, d'un jour à l'autre.
 *
 * Seul un arriéré qui dure veut dire quelque chose, et son premier jour ne se
 * reconstruit pas à partir des échéances, que les révisions ont déplacées : il
 * faut l'écrire. L'écriture se fait à la lecture du tableau de bord, seul
 * endroit qui regarde l'arriéré, et seulement quand l'état change.
 */
export type ArriereSuivi = {
  /** Assez long pour qu'on le dise. */
  signaler: boolean;
  /** Depuis combien de jours, aujourd'hui compris. Zéro quand il n'y en a pas. */
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

  // `ouvrirLeCompte` crée la ligne à l'inscription ; si elle manque, il n'y a
  // rien à suivre, et ce n'est pas ici qu'on la crée.
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
