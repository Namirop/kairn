import { prisma } from "@/lib/db/client";
import {
  type Abonnement,
  plafondDeConcepts,
  type Plan,
  planEffectif,
  SANS_ABONNEMENT,
} from "@/lib/domain/plafond-du-plan";

/**
 * L'abonnement d'un compte, réduit à ce qui décide de ses droits. Un compte sans
 * ligne vaut gratuit : la ligne ne se crée pas à l'inscription.
 *
 * Ce module lit. Seul le webhook écrit — un abonnement accordé par un chemin que
 * Stripe n'a pas confirmé serait un abonnement offert.
 */
export async function lireAbonnement(userId: string): Promise<Abonnement> {
  return (await lireLaLigne(userId)).abonnement;
}

/** La ligne d'abonnement du compte, et la résiliation qu'elle annonce. */
async function lireLaLigne(
  userId: string,
): Promise<{ abonnement: Abonnement; resilieALaFin: boolean }> {
  const ligne = await prisma.subscription.findUnique({
    where: { userId },
    select: { plan: true, currentPeriodEnd: true, cancelAtPeriodEnd: true },
  });

  if (!ligne) return { abonnement: SANS_ABONNEMENT, resilieALaFin: false };

  return {
    abonnement: { plan: ligne.plan, finDePeriode: ligne.currentPeriodEnd },
    resilieALaFin: ligne.cancelAtPeriodEnd,
  };
}

/** Le plafond de concepts d'un compte, à cet instant. */
export async function plafondDuCompte(
  userId: string,
  maintenant: Date = new Date(),
): Promise<number> {
  return plafondDeConcepts(await lireAbonnement(userId), maintenant);
}

/**
 * Ce que l'écran de l'offre a besoin de savoir, en une lecture.
 *
 * Le plan rendu est celui qui vaut : un abonnement échu sort en `GRATUIT`, comme
 * dans le calcul du plafond. La page n'a aucune règle à réappliquer, et
 * n'affiche jamais un plan payant à qui est déjà retombé au plafond gratuit.
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
  const { abonnement, resilieALaFin } = await lireLaLigne(userId);

  return {
    plan: planEffectif(abonnement, maintenant),
    plafond: plafondDeConcepts(abonnement, maintenant),
    finDePeriode: abonnement.finDePeriode,
    resilieALaFin,
  };
}
