import { attacherLeClientStripe, lireDossierStripe } from "@/lib/db/ecriture-de-labonnement";
import { mentionDeFacture, TVA_COLLECTEE } from "@/lib/domain/mention-de-tva";
import { stripe } from "./client";
import { objetIntrouvableChezStripe } from "./erreurs";

/**
 * Ce client existe-t-il encore, dans le mode où l'on parle ? Un identifiant en
 * base peut pointer vers un client de l'autre mode (test contre live) : Stripe
 * répond « No such customer » et ni l'achat ni le portail n'aboutissent. Un
 * aller-retour de plus sur un geste rare.
 */
async function repondEncore(clientId: string): Promise<boolean> {
  try {
    const client = await stripe().customers.retrieve(clientId);

    // Un client supprimé répond encore, avec un drapeau : il vaut un absent.
    return !("deleted" in client && client.deleted);
  } catch (erreur) {
    if (objetIntrouvableChezStripe(erreur)) {
      // Seule erreur du paiement après laquelle on avance, donc journalisée :
      // un dossier remplacé coupe l'historique de facturation en deux.
      console.info("[paiement] dossier client remplacé", { ancien: clientId });

      return false;
    }

    throw erreur;
  }
}

/**
 * Le client Stripe d'un compte, un pour toujours, créé par nous et non par
 * Checkout : c'est lui qui relie chaque webhook à un compte Kairn, là où les
 * métadonnées de session ne sont portées que par le premier événement. Un
 * réabonnement retombe ainsi dans le même dossier.
 */
export async function clientStripeDuCompte(compte: {
  id: string;
  email: string;
  name: string;
}): Promise<string> {
  const dossier = await lireDossierStripe(compte.id);

  if (dossier.clientId && (await repondEncore(dossier.clientId))) return dossier.clientId;

  const client = await stripe().customers.create(
    {
      email: compte.email,
      name: compte.name,
      // Pour retrouver un compte depuis le tableau de bord Stripe ; c'est notre
      // ligne qui fait foi.
      metadata: { userId: compte.id },
      // Sur le client et non la facture : Stripe le recopie sur chacune, y
      // compris les renouvellements, que ce code ne voit pas passer.
      invoice_settings: { footer: mentionDeFacture(TVA_COLLECTEE) ?? undefined },
    },
    // Deux clics rapprochés créeraient deux clients, dont un orphelin. La clé
    // est scopée par mode et vit 24 h : un dossier remplacé dans cette fenêtre
    // récupère le client précédent, qui est bien celui du compte.
    { idempotencyKey: `client-kairn-${compte.id}` },
  );

  await attacherLeClientStripe(compte.id, client.id);

  return client.id;
}
