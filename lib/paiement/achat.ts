import { ROUTES } from "@/lib/auth/routes";
import { lireDossierStripe } from "@/lib/db/ecriture-de-labonnement";
import { abonnementVivant, type CadenceStripe } from "@/lib/domain/rapport-de-stripe";
import { adresseDeLApp } from "@/lib/site/adresse-de-lapp";
import { prixDeLaCadence } from "./catalogue";
import { stripe } from "./client";
import { clientStripeDuCompte } from "./dossier-client";
import { AbonnementDejaOuvertError, objetIntrouvableChezStripe } from "./erreurs";
import { lireLeRapport } from "./rapport";

/** La carte se saisit chez Stripe : un numéro qui ne traverse pas ce serveur n'y fuit pas. */

/** Le navigateur devance souvent le webhook : sans lui, « gratuit » à qui vient de payer. */
export const PARAMETRE_DE_RETOUR = "paiement";
export const RETOUR_ACCEPTE = "fait";

/**
 * Deux onglets créeraient deux abonnements, dont un prélevant sans que Kairn le
 * voie. Ici et pas dans l'action, pour que tout ce qui vend la traverse.
 */
async function refuserSiDejaAbonne(userId: string): Promise<void> {
  const { abonnementId } = await lireDossierStripe(userId);

  if (!abonnementId) return;

  let abonnement;

  try {
    abonnement = await stripe().subscriptions.retrieve(abonnementId);
  } catch (erreur) {
    // Inconnu de Stripe (venu du mode test) : il ne facture rien.
    if (objetIntrouvableChezStripe(erreur)) return;

    throw erreur;
  }

  if (abonnementVivant(lireLeRapport(abonnement).statut)) {
    throw new AbonnementDejaOuvertError(abonnementId);
  }
}

export async function ouvrirLePaiement(
  compte: { id: string; email: string; name: string },
  cadence: CadenceStripe,
): Promise<string> {
  await refuserSiDejaAbonne(compte.id);

  const client = await clientStripeDuCompte(compte);
  const prix = await prixDeLaCadence(cadence);
  const app = adresseDeLApp();

  const session = await stripe().checkout.sessions.create({
    mode: "subscription",
    customer: client,
    line_items: [{ price: prix, quantity: 1 }],
    locale: "fr",
    success_url: `${app}${ROUTES.reglages}?${PARAMETRE_DE_RETOUR}=${RETOUR_ACCEPTE}`,
    cancel_url: `${app}${ROUTES.reglages}`,
    client_reference_id: compte.id,
    // Kairn ne demande pas de nom : sans celui du titulaire, factures au nom de personne.
    customer_update: { name: "auto" },
    // Pour le diagnostic seulement : le rattachement passe par le client Stripe.
    subscription_data: { metadata: { userId: compte.id } },
    // Managed Payments, actif par défaut, ferait de Stripe le marchand (+3,5 %)
    // et rejette la session sans code de taxe au catalogue. Sa TVA ne sert
    // qu'au-delà de 10 000 € de ventes UE ; activé plus tard, il ne couvrirait
    // que les abonnements souscrits ensuite.
    managed_payments: { enabled: false },
  });

  if (!session.url) {
    throw new Error(`Stripe n'a pas rendu d'adresse pour la session ${session.id}.`);
  }

  return session.url;
}
