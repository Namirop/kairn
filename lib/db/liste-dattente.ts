import { prisma } from "@/lib/db/client";

/**
 * Qui a dit que la limite le gênait : le seul signal pour savoir s'il faut
 * monter le plafond gratuit. Un compte qui sature sans rien dire ne distingue
 * pas « je voulais continuer » de « j'avais fini », et les ventes ne le disent
 * pas non plus.
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
