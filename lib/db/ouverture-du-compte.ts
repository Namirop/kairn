import { prisma } from "@/lib/db/client";
import type { Langue } from "@/lib/db/types";

/**
 * Crée les réglages et les compteurs d'un compte, dans une même transaction :
 * un compte sans `UserStats` casserait le tableau de bord au premier affichage.
 *
 * La langue est celle de l'inscription ; elle décide de l'email d'accueil et de
 * la langue du premier dépôt.
 */
export async function ouvrirLeCompte(
  userId: string,
  timezone: string,
  langue: Langue,
): Promise<void> {
  await prisma.$transaction([
    prisma.userSettings.create({ data: { userId, timezone, langue } }),
    prisma.userStats.create({ data: { userId } }),
  ]);
}
