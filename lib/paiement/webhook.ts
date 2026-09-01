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
 * Le seul chemin par lequel un compte devient payant.
 *
 * Ni la page de retour, ni l'écran de l'offre, ni la session Checkout n'ouvrent
 * de droit : tous peuvent être atteints par quelqu'un qui n'a rien payé. Le
 * webhook, lui, porte une signature — c'est ce qui fait qu'on peut le croire, et
 * c'est pour ça que la vérification n'a pas d'échappatoire ici.
 *
 * **Ce qui n'est pas un abonnement est ignoré, pas refusé.** Stripe envoie ce
 * qu'on lui a demandé et un peu plus ; répondre en erreur à un événement dont on
 * n'a rien à faire ferait relancer Stripe pendant trois jours pour rien, et
 * finirait par faire couper l'endpoint.
 */

/** Les trois événements qui disent l'état d'un abonnement portent l'objet entier. */

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
 * Vérifie la signature, puis applique.
 *
 * La signature est vérifiée sur le corps **brut**. C'est la seule raison pour
 * laquelle le route handler lit du texte et non du JSON : reformater l'objet,
 * même à l'identique, change les octets et casse la vérification.
 */
export async function traiterLeWebhook(corps: string, signature: string): Promise<Traitement> {
  const { secretDuWebhook } = lireConfigDePaiement();
  let evenement: Stripe.Event;

  try {
    evenement = await stripe().webhooks.constructEventAsync(corps, signature, secretDuWebhook);
  } catch (cause) {
    throw new SignatureInvalideError({ cause });
  }

  // Un `switch` et non un test d'appartenance : c'est lui qui apprend au
  // compilateur que ces trois types-là portent un abonnement, et pas l'un des
  // quatre-vingts autres objets que `data.object` peut contenir. Aucune
  // assertion de type n'est nécessaire, et un quatrième cas ajouté un jour sans
  // son traitement ne compilera pas.
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
 * Écrit ce que l'abonnement dit, pour le compte qui porte ce client Stripe.
 *
 * Un client inconnu n'est pas une erreur : le même compte Stripe peut servir un
 * autre produit, et un abonnement créé à la main depuis le tableau de bord n'a
 * pas de ligne chez nous. On le dit au journal et on rend la main — relancer
 * n'y changerait rien.
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
