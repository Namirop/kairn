import { prisma } from "@/lib/db/client";

/**
 * Qui a dit que la limite le gênait.
 *
 * C'est le seul retour qu'on ait sur le plafond : quelqu'un qui le rencontre et
 * qui s'arrête ne laisse aucune trace, et deux comptes qui saturent ne disent
 * pas la même chose selon qu'ils voulaient continuer ou qu'ils avaient fini.
 *
 * Vivait dans `quota-depots.ts`, qui décide des places. Ce module-ci n'en décide
 * aucune : il enregistre une intention, et il ne change ni au même rythme ni
 * pour les mêmes raisons.
 *
 * Il survit à l'arrivée du paiement. Tout le monde ne veut pas payer, et « la
 * limite me gêne » reste ce qui dira s'il faut monter le plafond gratuit — une
 * question à laquelle un chiffre de ventes ne répond pas.
 */
export async function inscrireEnListeDattente(userId: string, motif?: string): Promise<void> {
  await prisma.waitlistEntry.upsert({
    where: { userId },
    create: { userId, motif: motif ?? null },
    update: { motif: motif ?? null },
  });
}

export async function estEnListeDattente(userId: string): Promise<boolean> {
  return (await prisma.waitlistEntry.count({ where: { userId } })) > 0;
}
