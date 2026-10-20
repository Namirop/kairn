import { prisma } from "@/lib/db/client";
import {
  type Abonnement,
  plafondDeConcepts,
  type Plan,
  planEffectif,
  SANS_ABONNEMENT,
} from "@/lib/domain/plafond-du-plan";

/**
 * Sans ligne, gratuit : elle ne naît pas à l'inscription. Ce module lit ; seul
 * le webhook écrit, sinon un chemin non confirmé par Stripe offrirait un plan.
 */
export async function lireAbonnement(userId: string): Promise<Abonnement> {
  return (await lireLaLigne(userId)).abonnement;
}

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

export async function plafondDuCompte(
  userId: string,
  maintenant: Date = new Date(),
): Promise<number> {
  return plafondDeConcepts(await lireAbonnement(userId), maintenant);
}

/**
 * Le plan qui vaut : échu, il sort en `GRATUIT` comme dans le plafond. La page
 * n'a aucune règle à réappliquer.
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
