import { enregistrerLEtatDeLAbonnement, lireDossierStripe } from "@/lib/db/ecriture-de-labonnement";
import { etatDepuisStripe } from "@/lib/domain/rapport-de-stripe";
import { stripe } from "./client";
import { AucunAbonnementError } from "./erreurs";
import { lireLeRapport } from "./rapport";

/**
 * Depuis Kairn plutôt que le portail : un abonnement ne doit pas être dur à
 * quitter. Résilier laisse courir jusqu'au terme ; avant lui, reprendre ne
 * repaie rien.
 */

export async function arreterLAbonnement(userId: string): Promise<void> {
  await basculerLaResiliation(userId, true);
}

export async function reprendreLAbonnement(userId: string): Promise<void> {
  await basculerLaResiliation(userId, false);
}

/**
 * Écrit sans attendre le webhook, sinon l'écran montrerait l'état d'avant le
 * clic ; le webhook sera ignoré comme un rejeu (`stripeEventAt`). L'abonnement
 * vient de notre ligne, jamais du client.
 */
async function basculerLaResiliation(userId: string, resilier: boolean): Promise<void> {
  const dossier = await lireDossierStripe(userId);

  if (!dossier.abonnementId) throw new AucunAbonnementError();

  const abonnement = await stripe().subscriptions.update(dossier.abonnementId, {
    cancel_at_period_end: resilier,
  });

  await enregistrerLEtatDeLAbonnement({
    userId,
    etat: etatDepuisStripe(lireLeRapport(abonnement)),
    abonnementStripeId: abonnement.id,
    evenementA: new Date(),
  });
}
