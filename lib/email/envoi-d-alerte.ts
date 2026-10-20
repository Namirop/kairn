import { envoyerLEmail } from "./client";
import type { EmailRendu } from "./templates/gabarit";

/**
 * Hors de `envoyerLaNotification` : aucun utilisateur derrière ces alertes.
 * Sans `EMAIL_ALERTES`, on trace et on s'arrête : lever ferait échouer
 * l'opération surveillée. Pas de désabonnement : le destinataire n'est pas un compte.
 */
export async function envoyerUneAlerte(
  etiquette: string,
  composer: () => EmailRendu,
): Promise<void> {
  const destinataire = process.env.EMAIL_ALERTES?.trim();

  if (!destinataire) {
    console.warn(`[${etiquette}] alerte non envoyée : EMAIL_ALERTES absente de l'environnement.`);
    return;
  }

  const email = composer();

  await envoyerLEmail({
    to: destinataire,
    subject: email.subject,
    html: email.html,
    text: email.text,
  });
}
