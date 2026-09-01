import { prisma } from "@/lib/db/client";
import { evenementARetenir, type EtatDAbonnement } from "@/lib/domain/rapport-de-stripe";

/**
 * Ce qui écrit la ligne d'abonnement.
 *
 * À part de `abonnement.ts`, qui lit, et pour la raison qu'il énonce : le droit
 * de rendre un compte payant n'appartient qu'au webhook. Séparer les deux
 * fichiers fait que rien ne peut accorder un plan par mégarde en important le
 * module qui sert à l'afficher — un abonnement offert ne se voit pas, il ne
 * produit ni erreur ni réclamation.
 *
 * Le dossier client fait exception : il s'écrit avant tout paiement, il n'ouvre
 * aucun droit, et il est ici parce qu'il vit dans la même ligne.
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
 * Rattache un compte à son client Stripe, et crée la ligne si elle manque.
 *
 * C'est la première écriture de la vie d'un abonnement, et elle n'accorde rien :
 * un compte peut avoir un client Stripe sans avoir jamais payé — c'est
 * exactement l'état de quelqu'un qui a ouvert la page de paiement puis fermé
 * l'onglet. Le plan reste à sa valeur par défaut.
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
 * Écrit l'état d'un abonnement, si l'événement qui le porte a quelque chose à
 * apprendre à la ligne.
 *
 * **La règle est vérifiée deux fois, et ce n'est pas une redondance.**
 * `evenementARetenir` est la règle elle-même : elle est pure, elle est testée,
 * et c'est elle qui décide de ce qu'on rapporte à l'appelant. La condition
 * répétée dans le `where` est le verrou : deux webhooks traités en parallèle
 * liraient tous les deux l'ancienne valeur, et le plus vieux gagnerait la course
 * une fois sur deux. L'une dit pourquoi, l'autre empêche.
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
