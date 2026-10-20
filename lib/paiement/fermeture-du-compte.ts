import { lireDossierStripe } from "@/lib/db/ecriture-de-labonnement";
import { abonnementVivant } from "@/lib/domain/rapport-de-stripe";
import { stripe } from "./client";
import { objetIntrouvableChezStripe } from "./erreurs";
import { lireLeRapport } from "./rapport";

/**
 * La cascade efface notre trace, pas l'abonnement Stripe, qui prélèverait
 * encore. Coupé tout de suite, à la différence de `resiliation.ts` : personne
 * ne profitera des jours payés. Les rembourser serait une décision commerciale.
 */

/**
 * Lève si l'annulation échoue, et l'appelant renonce à supprimer : un compte de
 * trop se répare, un prélèvement sans trace non.
 */
export async function fermerLAbonnementDuCompte(userId: string): Promise<void> {
  const { abonnementId } = await lireDossierStripe(userId);

  if (!abonnementId) return;

  let abonnement;

  try {
    abonnement = await stripe().subscriptions.retrieve(abonnementId);
  } catch (erreur) {
    // Introuvable, il ne prélève rien ; refuser bloquerait la suppression à jamais.
    if (objetIntrouvableChezStripe(erreur)) return;

    throw erreur;
  }

  if (!abonnementVivant(lireLeRapport(abonnement).statut)) return;

  await stripe().subscriptions.cancel(abonnementId);
}
