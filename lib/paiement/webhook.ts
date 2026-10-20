import type Stripe from "stripe";
import {
  compteDuClientStripe,
  enregistrerLEtatDeLAbonnement,
} from "@/lib/db/ecriture-de-labonnement";
import { etatDepuisStripe } from "@/lib/domain/rapport-de-stripe";
import { stripe } from "./client";
import { lireConfigDePaiement } from "./config";
import { SignatureInvalideError } from "./erreurs";
import { lireLeRapport } from "./rapport";

/**
 * Le seul chemin vers un compte payant : la page de retour s'atteint sans payer,
 * le webhook seul est signé. Ce qui n'est pas un abonnement est ignoré, pas
 * refusé : une erreur ferait relancer Stripe trois jours, puis couper l'endpoint.
 */

export type Traitement =
  | { issue: "ecrit"; userId: string }
  /** Rejeu, ou événement plus ancien que ce que la ligne sait déjà. */
  | { issue: "ignore"; userId: string }
  | { issue: "sans-compte"; client: string }
  | { issue: "hors-sujet"; type: string };

/** Stripe le donne tantôt à plat, tantôt déplié. */
function identifiantDuClient(client: Stripe.Subscription["customer"]): string {
  return typeof client === "string" ? client : client.id;
}

/** Sur le corps brut : reformater le JSON changerait les octets signés. */
export async function traiterLeWebhook(corps: string, signature: string): Promise<Traitement> {
  const { secretDuWebhook } = lireConfigDePaiement();
  let evenement: Stripe.Event;

  try {
    evenement = await stripe().webhooks.constructEventAsync(corps, signature, secretDuWebhook);
  } catch (cause) {
    throw new SignatureInvalideError({ cause });
  }

  // Le `switch` affine `data.object` en abonnement, sans assertion de type.
  switch (evenement.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      return appliquer(evenement.data.object, new Date(evenement.created * 1000));
    default:
      return { issue: "hors-sujet", type: evenement.type };
  }
}

/** Client inconnu (autre produit, saisie manuelle) : pas une erreur, relancer n'y peut rien. */
async function appliquer(abonnement: Stripe.Subscription, evenementA: Date): Promise<Traitement> {
  const client = identifiantDuClient(abonnement.customer);
  const userId = await compteDuClientStripe(client);

  if (!userId) return { issue: "sans-compte", client };

  const issue = await enregistrerLEtatDeLAbonnement({
    userId,
    etat: etatDepuisStripe(lireLeRapport(abonnement)),
    abonnementStripeId: abonnement.id,
    evenementA,
  });

  return { issue, userId };
}
