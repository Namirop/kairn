import { prisma } from "@/lib/db/client";
import { debutEnDate, periodeDeQuota, type PeriodeDeQuota } from "@/lib/domain/periode-de-quota";

/**
 * Où en est un compte dans sa période. Lecture seule : ce qui prend et rend des
 * places vit dans `quota-depots.ts`, et les écrans qui lisent ici ne peuvent pas
 * écrire par accident.
 */

/**
 * La période en cours, ancrée à l'inscription. Un compte supprimé entre deux
 * requêtes ancre sur maintenant : il n'obtiendra rien, autant ne pas lever.
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
