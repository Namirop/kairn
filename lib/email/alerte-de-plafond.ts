import { envoyerLEmail } from "./client";
import {
  composerLAlerteDePlafond,
  type AlerteDePlafondPayload,
} from "./templates/alerte-de-plafond";

/**
 * L'envoi d'une alerte de plafond, à qui tient le produit.
 *
 * Pas de `envoyerLaNotification` : il vérifie le refus d'emails d'un utilisateur et
 * écrit dans `EmailDelivery`, alors qu'il n'y a pas d'utilisateur derrière
 * cette alerte (même raison que `connexion.ts`).
 *
 * Sans `EMAIL_ALERTES`, on trace et on s'arrête : lever ferait échouer la
 * réservation qu'on surveille.
 */
export async function envoyerLAlerteDePlafond(payload: AlerteDePlafondPayload): Promise<void> {
  const destinataire = process.env.EMAIL_ALERTES?.trim();

  if (!destinataire) {
    console.warn("[plafond] alerte non envoyée : EMAIL_ALERTES absente de l'environnement.");
    return;
  }

  const email = composerLAlerteDePlafond(payload);

  await envoyerLEmail({
    to: destinataire,
    subject: email.subject,
    html: email.html,
    text: email.text,
    // Aucun en-tête de désabonnement : ce n'est pas un envoi périodique, et le
    // destinataire n'est pas un compte.
  });
}
