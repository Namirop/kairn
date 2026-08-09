import { prisma } from "@/lib/db/client";

/**
 * Un compte n'existe vraiment qu'avec ses réglages et ses compteurs. Les deux
 * sont créés dans la même transaction que rien ne doit pouvoir couper en deux :
 * un compte sans UserStats casserait le tableau de bord au premier affichage.
 */
export async function provisionAccount(userId: string, timezone: string): Promise<void> {
  await prisma.$transaction([
    prisma.userSettings.create({ data: { userId, timezone } }),
    prisma.userStats.create({ data: { userId } }),
  ]);
}
