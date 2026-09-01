import { prisma } from "@/lib/db/client";
import { type Abonnement, plafondDeConcepts, SANS_ABONNEMENT } from "@/lib/domain/plafond-du-plan";

/**
 * L'abonnement d'un compte, réduit à ce qui décide de ses droits.
 *
 * Un compte sans ligne vaut gratuit, et c'est le cas de tout le monde jusqu'à
 * la première visite du paiement. La ligne ne se crée donc pas à l'inscription :
 * elle n'aurait rien de plus à dire que son absence, et il faudrait la
 * rattraper sur tous les comptes existants.
 *
 * Ce module lit. Ce qui écrit, c'est le webhook, et lui seul — un abonnement
 * accordé par un chemin que Stripe n'a pas confirmé serait un abonnement offert.
 */
export async function lireAbonnement(userId: string): Promise<Abonnement> {
  const ligne = await prisma.subscription.findUnique({
    where: { userId },
    select: { plan: true, currentPeriodEnd: true },
  });

  if (!ligne) return SANS_ABONNEMENT;

  return { plan: ligne.plan, finDePeriode: ligne.currentPeriodEnd };
}

/**
 * Le plafond de concepts d'un compte, à cet instant.
 *
 * Le raccourci que prennent le quota et les écrans : ils n'ont pas besoin du
 * plan, seulement du nombre. Ceux qui doivent dire *pourquoi* — l'écran qui
 * propose d'acheter, celui qui affiche l'offre — lisent l'abonnement entier.
 */
export async function plafondDuCompte(
  userId: string,
  maintenant: Date = new Date(),
): Promise<number> {
  return plafondDeConcepts(await lireAbonnement(userId), maintenant);
}
