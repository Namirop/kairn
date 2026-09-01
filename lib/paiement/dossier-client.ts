import { attacherLeClientStripe, lireDossierStripe } from "@/lib/db/ecriture-de-labonnement";
import { mentionDeFacture, TVA_COLLECTEE } from "@/lib/domain/mention-de-tva";
import { stripe } from "./client";

/**
 * Le client Stripe d'un compte : un pour toujours, créé à la première visite du
 * paiement.
 *
 * Pourquoi le créer nous-mêmes plutôt que laisser Checkout s'en charger : c'est
 * ce client qui relie tous les webhooks à venir à un compte Kairn. Un abonnement
 * créé par Checkout arrive avec un client que nous n'avons jamais vu, et il faut
 * alors le rattacher depuis les métadonnées de la session — donc faire confiance
 * à un champ que le premier événement porte et que les suivants ne portent plus.
 * Créer le client d'abord retourne la dépendance : quand un événement arrive, on
 * sait déjà de qui il parle.
 *
 * C'est aussi ce qui fait qu'un réabonnement retombe dans le même dossier plutôt
 * que d'en ouvrir un second, avec un historique de factures coupé en deux.
 */
export async function clientStripeDuCompte(compte: {
  id: string;
  email: string;
  name: string;
}): Promise<string> {
  const dossier = await lireDossierStripe(compte.id);

  if (dossier.clientId) return dossier.clientId;

  const client = await stripe().customers.create(
    {
      email: compte.email,
      name: compte.name,
      // L'identifiant Kairn voyage avec le client. Il ne sert pas à décider —
      // c'est notre ligne qui fait foi — mais à retrouver un compte depuis le
      // tableau de bord Stripe quand on cherche pourquoi un paiement a échoué.
      metadata: { userId: compte.id },
      // Le pied de page suit le client et non la facture : Stripe le recopie
      // sur chacune, y compris celles des renouvellements, que ce code ne verra
      // jamais passer. Le poser ailleurs obligerait à intercepter chaque
      // échéance pour ajouter une phrase obligatoire.
      invoice_settings: { footer: mentionDeFacture(TVA_COLLECTEE) ?? undefined },
    },
    // Deux clics sur « Payer » à une seconde d'écart, c'est deux clients
    // Stripe pour la même personne, dont un orphelin qui portera peut-être un
    // abonnement que rien ne rattache. La clé d'idempotence rend le second
    // appel identique au premier.
    { idempotencyKey: `client-kairn-${compte.id}` },
  );

  await attacherLeClientStripe(compte.id, client.id);

  return client.id;
}
