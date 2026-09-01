import { enregistrerLEtatDeLAbonnement, lireDossierStripe } from "@/lib/db/ecriture-de-labonnement";
import { etatDepuisStripe } from "@/lib/domain/rapport-de-stripe";
import { stripe } from "./client";
import { AucunAbonnementError } from "./erreurs";
import { lireLeRapport } from "./rapport";

/**
 * Arrêter, et reprendre.
 *
 * Le geste se fait ici et non dans le portail hébergé par Stripe. Un abonnement
 * qu'on ne peut résilier que sur un site tiers est un abonnement qu'on rend
 * difficile à quitter, et ce produit n'a pas envie d'être celui-là. Ça coûte
 * deux boutons et cette page ; ça vaut de ne jamais avoir à écrire « rendez-vous
 * sur le portail de notre prestataire pour vous désabonner ».
 *
 * **Rien ne se supprime.** Résilier lève un drapeau chez Stripe et laisse
 * l'abonnement courir jusqu'à son terme : c'est la date qui coupe, pas le
 * geste. Tant qu'elle n'est pas passée, reprendre est un simple retour en
 * arrière, sans nouveau paiement.
 */

export async function arreterLAbonnement(userId: string): Promise<void> {
  await basculerLaResiliation(userId, true);
}

export async function reprendreLAbonnement(userId: string): Promise<void> {
  await basculerLaResiliation(userId, false);
}

/**
 * Le geste, et son écriture immédiate.
 *
 * L'état est écrit sans attendre le webhook qui va le confirmer. Sans ça,
 * l'écran qu'on réaffiche juste après montrerait l'état d'avant le clic, et la
 * personne cliquerait une seconde fois. Le webhook arrivera, dira la même
 * chose, et sera ignoré comme un rejeu — c'est exactement ce que `stripeEventAt`
 * sait faire.
 *
 * L'abonnement visé vient de notre ligne, jamais du client : on ne peut arrêter
 * que ce qui est attaché au compte de la session.
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
