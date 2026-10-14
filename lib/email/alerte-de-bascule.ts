import { envoyerLEmail } from "./client";
import {
  composerLAlerteDeBascule,
  type AlerteDeBasculePayload,
} from "./templates/alerte-de-bascule";

/**
 * L'envoi d'une alerte de bascule Luna → Sonnet. Comme les autres alertes
 * d'exploitation : hors de `envoyerLaNotification`, vers `EMAIL_ALERTES`, et un
 * simple avertissement si la variable manque.
 */
export async function envoyerLAlerteDeBascule(payload: AlerteDeBasculePayload): Promise<void> {
  const destinataire = process.env.EMAIL_ALERTES?.trim();

  if (!destinataire) {
    console.warn("[bascule] alerte non envoyée : EMAIL_ALERTES absente de l'environnement.");
    return;
  }

  const email = composerLAlerteDeBascule(payload);

  await envoyerLEmail({
    to: destinataire,
    subject: email.subject,
    html: email.html,
    text: email.text,
  });
}
