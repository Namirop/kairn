import { prisma } from "@/lib/db/client";

/**
 * Seul signal pour monter le plafond gratuit : saturer sans rien dire ne
 * distingue pas « je voulais continuer » de « j'avais fini », les ventes non plus.
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
