import { prisma } from "@/lib/db/client";
import { sendNotification } from "@/lib/email/notifications";

/**
 * L'accueil, envoyé une fois, depuis le hook d'inscription.
 *
 * **Il ne peut pas faire échouer une inscription.** L'envoi est le dernier geste
 * d'un compte qui existe déjà : ses réglages sont posés, son essai est repris.
 * Si Resend refuse, si le réseau tombe, si le gabarit lève — le compte reste
 * créé et la personne entre. L'erreur est loguée avec l'identifiant du compte,
 * jamais avec l'adresse ni le contenu.
 *
 * Le compte est lu après la reprise de visite, et c'est ce qui compte : à cet
 * instant seulement, on sait si des concepts sont arrivés avec lui. L'email
 * n'est pas le même selon la réponse — voir `templates/accueil.ts`.
 */
export async function envoyerLAccueil(userId: string): Promise<void> {
  try {
    const conceptCount = await prisma.atom.count({ where: { userId } });

    await sendNotification(userId, { type: "ACCUEIL", payload: { conceptCount } });
  } catch (erreur) {
    console.error(`L'email d'accueil n'a pas pu partir pour le compte ${userId}.`, erreur);
  }
}
