import { prisma } from "@/lib/db/client";
import { envoyerLaNotification } from "@/lib/email/notifications";

/**
 * Ne fait jamais échouer une inscription. Après la reprise de visite : alors
 * seulement on sait si des concepts sont arrivés avec le compte.
 */
export async function envoyerLAccueil(userId: string): Promise<void> {
  try {
    const nombreDeConcepts = await prisma.atom.count({ where: { userId } });

    await envoyerLaNotification(userId, { type: "ACCUEIL", payload: { nombreDeConcepts } });
  } catch (erreur) {
    console.error(`L'email d'accueil n'a pas pu partir pour le compte ${userId}.`, erreur);
  }
}
