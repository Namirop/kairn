import { sendEmail } from "./client";
import {
  renderAlerteDePaiement,
  type AlerteDePaiementPayload,
} from "./templates/alerte-de-paiement";

/**
 * L'envoi d'une alerte de webhook de paiement en échec.
 *
 * Même règle que les alertes de plafond et de bascule : ne passe pas par
 * `sendNotification`, destinataire = `EMAIL_ALERTES` en variable
 * d'environnement, silence propre si la variable est absente.
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
