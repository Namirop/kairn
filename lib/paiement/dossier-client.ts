import { attacherLeClientStripe, lireDossierStripe } from "@/lib/db/ecriture-de-labonnement";
import { mentionDeFacture, TVA_COLLECTEE } from "@/lib/domain/mention-de-tva";
import { stripe } from "./client";
import { objetIntrouvableChezStripe } from "./erreurs";

/**
 * Ce client existe-t-il encore, dans le mode où l'on parle ?
 *
 * **Un identifiant en base n'est pas une preuve d'existence.** Le jour de la
 * bascule vers la production, toutes les lignes pointent vers des clients créés
 * en test : Stripe répond alors « No such customer », et ni l'achat ni le
 * portail n'aboutissent — pour un compte qui n'a rien fait de mal, et sans qu'un
 * seul test ait pu le voir venir.
 *
 * Le coût est un aller-retour de plus par ouverture de paiement, c'est-à-dire
 * rien : ce geste est rare, et il vaut mieux le payer que de refuser une vente.
 */
async function repondEncore(clientId: string): Promise<boolean> {
  try {
    const client = await stripe().customers.retrieve(clientId);

    // Un client supprimé répond encore, mais avec un drapeau : il ne peut plus
    // rien porter, et vaut donc autant qu'un client absent.
    return !("deleted" in client && client.deleted);
  } catch (erreur) {
    if (objetIntrouvableChezStripe(erreur)) {
      // Le seul endroit du paiement où l'on avance après une erreur, et il est
      // journalisé pour ça : un dossier remplacé se remarque en exploitation,
      // parce qu'il coupe l'historique de facturation en deux.
      console.info("[paiement] dossier client remplacé", { ancien: clientId });

      return false;
    }

    throw erreur;
  }
}

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

  if (dossier.clientId && (await repondEncore(dossier.clientId))) return dossier.clientId;

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
    //
    // Elle est scopée par mode et vit vingt-quatre heures, ce qui a une
    // conséquence à connaître : un dossier remplacé dans cette fenêtre récupère
    // le client de l'appel précédent au lieu d'en créer un neuf. C'est sans
    // effet le jour d'une bascule — la clé n'a jamais servi de l'autre côté —
    // et c'est le bon comportement partout ailleurs, puisque ce client-là est
    // justement celui du compte.
    { idempotencyKey: `client-kairn-${compte.id}` },
  );

  await attacherLeClientStripe(compte.id, client.id);

  return client.id;
}
