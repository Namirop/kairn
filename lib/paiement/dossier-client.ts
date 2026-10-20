import { attacherLeClientStripe, lireDossierStripe } from "@/lib/db/ecriture-de-labonnement";
import { mentionDeFacture, TVA_COLLECTEE } from "@/lib/domain/mention-de-tva";
import { stripe } from "./client";
import { objetIntrouvableChezStripe } from "./erreurs";

/**
 * Un id en base peut venir de l'autre mode (test contre live) : « No such
 * customer » bloquerait achat et portail. Un aller-retour de plus, sur un geste rare.
 */
async function repondEncore(clientId: string): Promise<boolean> {
  try {
    const client = await stripe().customers.retrieve(clientId);

    // Un client supprimé répond encore, avec un drapeau.
    return !("deleted" in client && client.deleted);
  } catch (erreur) {
    if (objetIntrouvableChezStripe(erreur)) {
      // Journalisée : un dossier remplacé coupe l'historique de facturation en deux.
      console.info("[paiement] dossier client remplacé", { ancien: clientId });

      return false;
    }

    throw erreur;
  }
}

/**
 * Un pour toujours, créé par nous et non par Checkout : il relie chaque webhook
 * au compte, quand les métadonnées de session ne suivent que le premier
 * événement. Un réabonnement retombe dans le même dossier.
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
      // Pour le tableau de bord Stripe ; notre ligne fait foi.
      metadata: { userId: compte.id },
      // Sur le client : Stripe le recopie sur chaque facture, renouvellements compris.
      invoice_settings: { footer: mentionDeFacture(TVA_COLLECTEE) ?? undefined },
    },
    // Contre le double clic. Scopée par mode, 24 h : un dossier remplacé dans la
    // fenêtre récupère le client précédent, qui est bien celui du compte.
    { idempotencyKey: `client-kairn-${compte.id}` },
  );

  await attacherLeClientStripe(compte.id, client.id);

  return client.id;
}
