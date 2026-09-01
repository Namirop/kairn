import { prisma } from "@/lib/db/client";
import { debutEnDate, periodeDeQuota, type PeriodeDeQuota } from "@/lib/domain/periode-de-quota";

/**
 * Où en est un compte dans sa période, et où sa période commence.
 *
 * Lecture seule. Ce qui prend et rend des places vit dans `quota-depots.ts` :
 * ici on regarde, là-bas on décide. La distinction n'est pas cosmétique — les
 * écrans lisent sans jamais réserver, et un module qui ne fait que lire ne peut
 * pas provoquer d'écriture par accident.
 */

/**
 * La période en cours d'un compte.
 *
 * L'ancrage est la date d'inscription. Un compte introuvable — supprimé entre
 * deux requêtes — ancre sur maintenant : il n'obtiendra rien de toute façon,
 * autant que le calcul ne lève pas.
 */
export async function periodeDuCompte(
  userId: string,
  fuseau: string,
  maintenant: Date = new Date(),
): Promise<PeriodeDeQuota> {
  const compte = await prisma.user.findUnique({
    where: { id: userId },
    select: { createdAt: true },
  });

  return periodeDeQuota(compte?.createdAt ?? maintenant, maintenant, fuseau);
}

export type UsageDeLaPeriode = {
  depots: number;
  concepts: number;
  periode: PeriodeDeQuota;
};

export async function lireUsageDeLaPeriode(
  userId: string,
  fuseau: string,
  maintenant: Date = new Date(),
): Promise<UsageDeLaPeriode> {
  const periode = await periodeDuCompte(userId, fuseau, maintenant);
  const usage = await prisma.monthlyUsage.findUnique({
    where: { userId_periodStart: { userId, periodStart: debutEnDate(periode) } },
  });

  return { depots: usage?.deposits ?? 0, concepts: usage?.concepts ?? 0, periode };
}
