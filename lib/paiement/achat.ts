import { ROUTES } from "@/lib/auth/routes";
import type { CadenceStripe } from "@/lib/domain/rapport-de-stripe";
import { adresseDeLApp } from "@/lib/site/adresse-de-lapp";
import { prixDeLaCadence } from "./catalogue";
import { stripe } from "./client";
import { clientStripeDuCompte } from "./dossier-client";

/**
 * Ouvrir un paiement, et rendre l'adresse où l'envoyer.
 *
 * La saisie de carte se fait chez Stripe et pas chez nous, et c'est une
 * décision de sécurité avant d'être une décision de design : un numéro de carte
 * qui ne traverse jamais ce serveur est un numéro de carte qu'aucune faille
 * d'ici ne peut fuiter. Ce que ça coûte — une page qui n'est pas à nos
 * couleurs, le temps d'un formulaire — est le bon prix.
 */

/**
 * Le paramètre qui dit qu'on revient d'un paiement accepté.
 *
 * Il existe parce que le webhook et le navigateur reviennent par deux chemins
 * différents : la personne est souvent de retour sur l'écran avant que Stripe
 * nous ait dit quoi que ce soit. Sans ce paramètre, l'écran afficherait « offre
 * gratuite » à quelqu'un qui vient de payer, ce qui ressemble à un paiement
 * perdu.
 */
export const PARAMETRE_DE_RETOUR = "paiement";
export const RETOUR_ACCEPTE = "fait";

export async function ouvrirLePaiement(
  compte: { id: string; email: string; name: string },
  cadence: CadenceStripe,
): Promise<string> {
  const client = await clientStripeDuCompte(compte);
  const prix = await prixDeLaCadence(cadence);
  const app = adresseDeLApp();

  const session = await stripe().checkout.sessions.create({
    mode: "subscription",
    customer: client,
    line_items: [{ price: prix, quantity: 1 }],
    locale: "fr",
    success_url: `${app}${ROUTES.reglages}?${PARAMETRE_DE_RETOUR}=${RETOUR_ACCEPTE}`,
    // Abandonner ramène à l'écran d'où l'on vient, sans paramètre : il ne s'est
    // rien passé, et l'écran n'a rien à raconter.
    cancel_url: `${app}${ROUTES.reglages}`,
    client_reference_id: compte.id,
    // Portée par l'abonnement lui-même, donc présente sur tous les événements
    // qu'il produira. Le rattachement, lui, passe par le client Stripe, qui est
    // à nous : ces métadonnées servent au diagnostic, pas à la décision.
    subscription_data: { metadata: { userId: compte.id } },
  });

  if (!session.url) {
    throw new Error(`Stripe n'a pas rendu d'adresse pour la session ${session.id}.`);
  }

  return session.url;
}
