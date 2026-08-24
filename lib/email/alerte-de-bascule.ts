import { sendEmail } from "./client";
import { renderAlerteDeBascule, type AlerteDeBasculePayload } from "./templates/alerte-de-bascule";

/**
 * L'envoi d'une alerte de bascule Luna → Sonnet. Même règle que l'alerte de
 * plafond : ne passe pas par `sendNotification`, destinataire = `EMAIL_ALERTES`
 * en variable d'environnement, silence propre si la variable est absente.
 */
export async function envoyerLAlerteDeBascule(payload: AlerteDeBasculePayload): Promise<void> {
  const destinataire = process.env.EMAIL_ALERTES?.trim();

  if (!destinataire) {
    console.warn("[bascule] alerte non envoyée : EMAIL_ALERTES absente de l'environnement.");
    return;
  }

  const email = renderAlerteDeBascule(payload);

  await sendEmail({
    to: destinataire,
    subject: email.subject,
    html: email.html,
    text: email.text,
  });
}
