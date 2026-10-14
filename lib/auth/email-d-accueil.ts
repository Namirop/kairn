import { prisma } from "@/lib/db/client";
import { envoyerLaNotification } from "@/lib/email/notifications";

/**
 * L'accueil, envoyé une fois, depuis le hook d'inscription. Il ne peut pas
 * faire échouer une inscription : l'erreur est loguée avec l'identifiant du
 * compte, jamais l'adresse.
 *
 * À appeler après la reprise de visite : c'est seulement alors qu'on sait si
 * des concepts sont arrivés avec le compte (voir `templates/accueil.ts`).
 */
export async function envoyerLAccueil(userId: string): Promise<void> {
  try {
    const nombreDeConcepts = await prisma.atom.count({ where: { userId } });

    await envoyerLaNotification(userId, { type: "ACCUEIL", payload: { nombreDeConcepts } });
  } catch (erreur) {
    console.error(`L'email d'accueil n'a pas pu partir pour le compte ${userId}.`, erreur);
  }
}
