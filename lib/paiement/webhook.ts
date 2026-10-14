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
 * Le seul chemin par lequel un compte devient payant : la page de retour et la
 * session Checkout sont atteignables sans payer, le webhook seul est signé.
 *
 * Ce qui n'est pas un abonnement est ignoré, pas refusé : une erreur ferait
 * relancer Stripe pendant trois jours, puis couper l'endpoint.
 */

/** Ce qu'un événement a produit, pour que le journal le dise en un mot. */
export type Traitement =
  /** L'abonnement du compte a changé. */
  | { issue: "ecrit"; userId: string }
  /** Rejeu, ou événement plus ancien que ce que la ligne sait déjà. */
  | { issue: "ignore"; userId: string }
  /** Un abonnement dont le client Stripe n'est rattaché à aucun compte. */
  | { issue: "sans-compte"; client: string }
  /** Un type d'événement dont ce produit n'a rien à faire. */
  | { issue: "hors-sujet"; type: string };

/** L'identifiant du client, que Stripe donne tantôt à plat, tantôt déplié. */
function identifiantDuClient(client: Stripe.Subscription["customer"]): string {
  return typeof client === "string" ? client : client.id;
}

/**
 * Vérifie la signature, puis applique. Sur le corps brut : le route handler lit
 * du texte et non du JSON, car reformater changerait les octets signés.
 */
export async function traiterLeWebhook(corps: string, signature: string): Promise<Traitement> {
  const { secretDuWebhook } = lireConfigDePaiement();
  let evenement: Stripe.Event;

  try {
    evenement = await stripe().webhooks.constructEventAsync(corps, signature, secretDuWebhook);
  } catch (cause) {
    throw new SignatureInvalideError({ cause });
  }

  // Un `switch` et non un test d'appartenance : c'est lui qui fait savoir au
  // compilateur que `data.object` est un abonnement, sans assertion de type.
  switch (evenement.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      return appliquer(evenement.data.object, new Date(evenement.created * 1000));
    default:
      return { issue: "hors-sujet", type: evenement.type };
  }
}

/**
 * Écrit ce que l'abonnement dit, pour le compte qui porte ce client Stripe. Un
 * client inconnu (autre produit, abonnement créé à la main) n'est pas une
 * erreur : relancer n'y changerait rien.
 */
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
