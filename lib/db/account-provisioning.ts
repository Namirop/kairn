import { prisma } from "@/lib/db/client";
import type { Langue } from "@/lib/db/types";

/**
 * Un compte n'existe vraiment qu'avec ses réglages et ses compteurs. Les deux
 * sont créés dans la même transaction que rien ne doit pouvoir couper en deux :
 * un compte sans UserStats casserait le tableau de bord au premier affichage.
 *
 * La langue est celle dans laquelle la personne s'est inscrite : c'est elle
 * qui décide de l'email d'accueil, parti dans la foulée, et de ce que son
 * premier dépôt rendra.
 */
export async function provisionAccount(
  userId: string,
  timezone: string,
  langue: Langue,
): Promise<void> {
  await prisma.$transaction([
    prisma.userSettings.create({ data: { userId, timezone, langue } }),
    prisma.userStats.create({ data: { userId } }),
  ]);
}
