import { prisma } from "@/lib/db/client";
import {
  type Abonnement,
  plafondDeConcepts,
  type Plan,
  planEffectif,
  SANS_ABONNEMENT,
} from "@/lib/domain/plafond-du-plan";

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

/**
 * Ce que l'écran de l'offre a besoin de savoir, en une lecture.
 *
 * Le plan rendu est déjà celui qui **vaut** : un abonnement dont le terme est
 * passé sort d'ici en `GRATUIT`, comme il sort du calcul de plafond. La page
 * n'a donc aucune règle à réappliquer — c'est ce qui garantit qu'elle n'affiche
 * jamais « Complet » à quelqu'un dont le quota est déjà retombé à trente.
 */
export type OffreDuCompte = {
  plan: Plan;
  plafond: number;
  finDePeriode: Date | null;
  resilieALaFin: boolean;
};

export async function lireLOffreDuCompte(
  userId: string,
  maintenant: Date = new Date(),
): Promise<OffreDuCompte> {
  const ligne = await prisma.subscription.findUnique({
    where: { userId },
    select: { plan: true, currentPeriodEnd: true, cancelAtPeriodEnd: true },
  });

  const abonnement: Abonnement = ligne
    ? { plan: ligne.plan, finDePeriode: ligne.currentPeriodEnd }
    : SANS_ABONNEMENT;

  return {
    plan: planEffectif(abonnement, maintenant),
    plafond: plafondDeConcepts(abonnement, maintenant),
    finDePeriode: abonnement.finDePeriode,
    resilieALaFin: ligne?.cancelAtPeriodEnd ?? false,
  };
}
