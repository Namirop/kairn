import { prisma } from "@/lib/db/client";
import { evenementARetenir, type EtatDAbonnement } from "@/lib/domain/rapport-de-stripe";

/**
 * Ce qui écrit la ligne d'abonnement, à part de `abonnement.ts` qui la lit :
 * seul le webhook rend un compte payant, et rien ne doit pouvoir accorder un
 * plan en important le module d'affichage.
 *
 * Le dossier client fait exception : il s'écrit avant tout paiement et n'ouvre
 * aucun droit.
 */

/** Le dossier d'un compte chez Stripe, tel qu'on le connaît. */
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

/**
 * Rattache un compte à son client Stripe, en créant la ligne si elle manque.
 * N'accorde rien : on a un client Stripe dès qu'on ouvre la page de paiement,
 * même sans payer.
 */
export async function attacherLeClientStripe(userId: string, clientId: string): Promise<void> {
  await prisma.subscription.upsert({
    where: { userId },
    create: { userId, stripeCustomerId: clientId },
    update: { stripeCustomerId: clientId },
  });
}

/** Le compte derrière un client Stripe. Nul si ce client n'est pas des nôtres. */
export async function compteDuClientStripe(clientId: string): Promise<string | null> {
  const ligne = await prisma.subscription.findUnique({
    where: { stripeCustomerId: clientId },
    select: { userId: true },
  });

  return ligne?.userId ?? null;
}

/** Ce qu'une écriture d'abonnement a donné, pour que le journal puisse le dire. */
export type Ecriture = "ecrit" | "ignore";

/**
 * Écrit l'état d'un abonnement si l'événement est plus récent que le dernier
 * retenu.
 *
 * La règle est vérifiée deux fois, à dessein : `evenementARetenir` décide ce
 * qu'on rapporte, la condition du `where` sert de verrou. Sans elle, deux
 * webhooks en parallèle liraient la même valeur et le plus vieux pourrait
 * gagner.
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
