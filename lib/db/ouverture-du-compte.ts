import { prisma } from "@/lib/db/client";
import type { Langue } from "@/lib/db/types";

/**
 * Une transaction : sans `UserStats`, le tableau de bord casserait au premier
 * affichage. La langue d'inscription décide de l'accueil et du premier dépôt.
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
