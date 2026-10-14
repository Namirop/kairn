import { lireDossierStripe } from "@/lib/db/ecriture-de-labonnement";
import { abonnementVivant } from "@/lib/domain/rapport-de-stripe";
import { stripe } from "./client";
import { objetIntrouvableChezStripe } from "./erreurs";
import { lireLeRapport } from "./rapport";

/**
 * Couper l'abonnement d'un compte qui va disparaître. La cascade efface la
 * ligne `Subscription` et l'identifiant du client, mais l'abonnement Stripe
 * continuerait de prélever sans plus aucune trace.
 *
 * Contrairement à `resiliation.ts`, on coupe tout de suite : il ne reste
 * personne pour profiter des jours payés. Ils ne sont pas remboursés, ce qui
 * serait une décision commerciale.
 */

/**
 * Annule l'abonnement du compte s'il en a un qui vit encore ; sans dossier ou
 * abonnement fini, Stripe n'est pas appelé.
 *
 * Lève si l'annulation échoue : l'appelant doit alors renoncer à supprimer le
 * compte, un compte de trop étant réparable, un prélèvement sans trace non.
 */
export async function fermerLAbonnementDuCompte(userId: string): Promise<void> {
  const { abonnementId } = await lireDossierStripe(userId);

  if (!abonnementId) return;

  let abonnement;

  try {
    abonnement = await stripe().subscriptions.retrieve(abonnementId);
  } catch (erreur) {
    // Introuvable : il ne prélève rien. Refuser ici bloquerait la suppression
    // pour toujours.
    if (objetIntrouvableChezStripe(erreur)) return;

    throw erreur;
  }

  if (!abonnementVivant(lireLeRapport(abonnement).statut)) return;

  await stripe().subscriptions.cancel(abonnementId);
}
