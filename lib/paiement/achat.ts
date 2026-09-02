import { ROUTES } from "@/lib/auth/routes";
import { lireDossierStripe } from "@/lib/db/ecriture-de-labonnement";
import { abonnementVivant, type CadenceStripe } from "@/lib/domain/rapport-de-stripe";
import { adresseDeLApp } from "@/lib/site/adresse-de-lapp";
import { prixDeLaCadence } from "./catalogue";
import { stripe } from "./client";
import { clientStripeDuCompte } from "./dossier-client";
import { AbonnementDejaOuvertError } from "./erreurs";
import { lireLeRapport } from "./rapport";

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

/**
 * Refuse d'ouvrir un paiement à qui en a déjà un.
 *
 * L'écran ne montre pas le bouton d'achat à un compte abonné — mais un écran
 * n'est pas une garantie. Deux onglets ouverts sur les réglages, dont l'un
 * affiche encore l'état d'avant, suffisent : les deux paiements aboutissent,
 * Stripe crée deux abonnements pour le même client, et notre ligne n'en retient
 * qu'un. Le premier devient alors invisible pour Kairn tout en continuant de
 * prélever tous les mois.
 *
 * La garde est ici et pas dans l'action, parce que c'est la fonction qui vend :
 * tout ce qui ouvre un paiement doit la traverser, y compris un script.
 */
async function refuserSiDejaAbonne(userId: string): Promise<void> {
  const { abonnementId } = await lireDossierStripe(userId);

  if (!abonnementId) return;

  const abonnement = await stripe().subscriptions.retrieve(abonnementId);

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
    // Abandonner ramène à l'écran d'où l'on vient, sans paramètre : il ne s'est
    // rien passé, et l'écran n'a rien à raconter.
    cancel_url: `${app}${ROUTES.reglages}`,
    client_reference_id: compte.id,
    // Le nom du titulaire, recopié du tunnel vers le client Stripe.
    //
    // Kairn ne demande pas de nom à l'inscription — c'est voulu, on ouvre un
    // compte avec une adresse et rien d'autre. Mais Stripe, lui, demande le nom
    // du titulaire de la carte : sans cette ligne il le garde pour le moyen de
    // paiement, et les factures sortent au nom de personne. Ça ne gêne pas qui
    // paie sept euros pour lui-même ; ça gêne qui veut passer l'abonnement en
    // frais professionnels.
    //
    // « auto » plutôt qu'un champ de plus dans le tunnel : l'information est
    // déjà saisie, il ne manquait que de dire où la ranger.
    customer_update: { name: "auto" },
    // Portée par l'abonnement lui-même, donc présente sur tous les événements
    // qu'il produira. Le rattachement, lui, passe par le client Stripe, qui est
    // à nous : ces métadonnées servent au diagnostic, pas à la décision.
    subscription_data: { metadata: { userId: compte.id } },
    // **Le vendeur, c'est Kairn.** Managed Payments est activé par défaut sur le
    // compte Stripe et ferait de Stripe le marchand de référence : il
    // collecterait et reverserait la TVA dans quatre-vingts pays, émettrait les
    // factures et les emails à notre place, et prélèverait 3,5 % de plus par
    // transaction. Sans ce refus, la session est simplement rejetée — le
    // catalogue n'a pas de code de taxe, que Managed Payments exige.
    //
    // Le refus est écrit ici plutôt que laissé à une case du tableau de bord,
    // parce que c'est une décision de facturation : elle doit se lire dans le
    // code qui vend, et ne pas dépendre d'un réglage que personne ne relit.
    //
    // Décidée le 02/09/2026, sur la comparaison des deux coûts : 3,5 % dès le
    // premier euro contre un service — la conformité de TVA multi-pays — qui ne
    // sert qu'au-delà de 10 000 € de ventes annuelles aux particuliers du reste
    // de l'UE, seuil auquel la franchise en base européenne répond sans
    // commission. Rien n'est fermé : Managed Payments s'active plus tard, mais
    // pour les seuls abonnements souscrits après. Ceux d'avant n'y sont jamais
    // éligibles, et c'est ce qui fait que le choix se pose maintenant.
    managed_payments: { enabled: false },
  });

  if (!session.url) {
    throw new Error(`Stripe n'a pas rendu d'adresse pour la session ${session.id}.`);
  }

  return session.url;
}
