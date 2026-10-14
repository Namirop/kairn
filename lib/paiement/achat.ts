import { ROUTES } from "@/lib/auth/routes";
import { lireDossierStripe } from "@/lib/db/ecriture-de-labonnement";
import { abonnementVivant, type CadenceStripe } from "@/lib/domain/rapport-de-stripe";
import { adresseDeLApp } from "@/lib/site/adresse-de-lapp";
import { prixDeLaCadence } from "./catalogue";
import { stripe } from "./client";
import { clientStripeDuCompte } from "./dossier-client";
import { AbonnementDejaOuvertError, objetIntrouvableChezStripe } from "./erreurs";
import { lireLeRapport } from "./rapport";

/**
 * Ouvrir un paiement, et rendre l'adresse où l'envoyer. La carte se saisit chez
 * Stripe : un numéro qui ne traverse jamais ce serveur ne peut pas y fuiter.
 */

/**
 * Le paramètre du retour d'un paiement accepté. Le navigateur revient souvent
 * avant le webhook : sans lui, l'écran afficherait « offre gratuite » à qui
 * vient de payer.
 */
export const PARAMETRE_DE_RETOUR = "paiement";
export const RETOUR_ACCEPTE = "fait";

/**
 * Refuse d'ouvrir un paiement à qui en a déjà un. Deux onglets suffisent à
 * créer deux abonnements chez Stripe, dont un seul retenu par notre ligne :
 * l'autre prélèverait sans que Kairn le voie.
 *
 * Ici et pas dans l'action, pour que tout ce qui vend la traverse.
 */
async function refuserSiDejaAbonne(userId: string): Promise<void> {
  const { abonnementId } = await lireDossierStripe(userId);

  if (!abonnementId) return;

  let abonnement;

  try {
    abonnement = await stripe().subscriptions.retrieve(abonnementId);
  } catch (erreur) {
    // Un abonnement inconnu de Stripe (gardé du mode test, par exemple) ne
    // facture rien, donc n'interdit rien.
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
    // Kairn ne demande pas de nom : on recopie sur le client celui du titulaire
    // saisi dans le tunnel, sans quoi les factures sortent au nom de personne.
    customer_update: { name: "auto" },
    // Pour le diagnostic seulement : le rattachement passe par le client Stripe.
    subscription_data: { metadata: { userId: compte.id } },
    // Le vendeur, c'est Kairn. Managed Payments, actif par défaut sur le compte,
    // ferait de Stripe le marchand de référence pour 3,5 % de plus par
    // transaction, et rejette la session faute de code de taxe au catalogue.
    // Sa conformité TVA ne sert qu'au-delà de 10 000 € de ventes UE ; activé
    // plus tard, il ne couvrirait que les abonnements souscrits ensuite.
    managed_payments: { enabled: false },
  });

  if (!session.url) {
    throw new Error(`Stripe n'a pas rendu d'adresse pour la session ${session.id}.`);
  }

  return session.url;
}
