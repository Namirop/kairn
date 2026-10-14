import { sendEmail } from "./client";
import {
  renderAlerteDePaiement,
  type AlerteDePaiementPayload,
} from "./templates/alerte-de-paiement";

/**
 * L'envoi d'une alerte de webhook de paiement en échec.
 *
 * Comme les autres alertes d'exploitation : hors de `sendNotification`, vers
 * `EMAIL_ALERTES`, et un simple avertissement si la variable manque.
 */
export async function envoyerLAlerteDePaiement(payload: AlerteDePaiementPayload): Promise<void> {
  const destinataire = process.env.EMAIL_ALERTES?.trim();

  if (!destinataire) {
    console.warn("[paiement] alerte non envoyée : EMAIL_ALERTES absente de l'environnement.");
    return;
  }

  const email = renderAlerteDePaiement(payload);

  await sendEmail({
    to: destinataire,
    subject: email.subject,
    html: email.html,
    text: email.text,
  });
}
