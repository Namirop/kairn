import { prisma } from "@/lib/db/client";
import { evenementARetenir, type EtatDAbonnement } from "@/lib/domain/rapport-de-stripe";

/**
 * Écrit la ligne d'abonnement, à part de `abonnement.ts` qui la lit : seul le
 * webhook rend un compte payant, rien ne doit accorder un plan en important le
 * module d'affichage. Le dossier client, écrit avant paiement, n'ouvre aucun droit.
 */

export type DossierStripe = {
  clientId: string | null;
  abonnementId: string | null;
};

export async function lireDossierStripe(userId: string): Promise<DossierStripe> {
  const ligne = await prisma.subscription.findUnique({
    where: { userId },
    select: { stripeCustomerId: true, stripeSubscriptionId: true },
  });

  return {
    clientId: ligne?.stripeCustomerId ?? null,
    abonnementId: ligne?.stripeSubscriptionId ?? null,
  };
}

/** N'accorde rien : ouvrir la page de paiement suffit à avoir un client Stripe. */
export async function attacherLeClientStripe(userId: string, clientId: string): Promise<void> {
  await prisma.subscription.upsert({
    where: { userId },
    create: { userId, stripeCustomerId: clientId },
    update: { stripeCustomerId: clientId },
  });
}

/** Nul si ce client n'est pas des nôtres. */
export async function compteDuClientStripe(clientId: string): Promise<string | null> {
  const ligne = await prisma.subscription.findUnique({
    where: { stripeCustomerId: clientId },
    select: { userId: true },
  });

  return ligne?.userId ?? null;
}

/** Pour que le journal puisse le dire. */
export type Ecriture = "ecrit" | "ignore";

/**
 * Si l'événement est plus récent que le dernier retenu. Vérifié deux fois :
 * `evenementARetenir` décide ce qu'on rapporte, le `where` sert de verrou, sans
 * quoi de deux webhooks parallèles le plus vieux pourrait gagner.
 */
export async function enregistrerLEtatDeLAbonnement(entree: {
  userId: string;
  etat: EtatDAbonnement;
  abonnementStripeId: string;
  evenementA: Date;
}): Promise<Ecriture> {
  const ligne = await prisma.subscription.findUnique({
    where: { userId: entree.userId },
    select: { stripeEventAt: true },
  });

  if (!evenementARetenir(ligne?.stripeEventAt ?? null, entree.evenementA)) return "ignore";

  const touchees = await prisma.subscription.updateMany({
    where: {
      userId: entree.userId,
      OR: [{ stripeEventAt: null }, { stripeEventAt: { lt: entree.evenementA } }],
    },
    data: {
      plan: entree.etat.plan,
      currentPeriodEnd: entree.etat.finDePeriode,
      cancelAtPeriodEnd: entree.etat.resilieALaFin,
      stripeSubscriptionId: entree.abonnementStripeId,
      stripeEventAt: entree.evenementA,
    },
  });

  return touchees.count > 0 ? "ecrit" : "ignore";
}
