import { ROUTES } from "@/lib/auth/routes";
import { adresseDeLApp } from "@/lib/site/adresse-de-lapp";
import { envoyerLEmail } from "./client";
import { composerLAlerteDeRetour, type AlerteDeRetourPayload } from "./templates/alerte-de-retour";

/**
 * L'envoi d'une alerte de retour. Comme les autres alertes d'exploitation :
 * hors de `envoyerLaNotification`, vers `EMAIL_ALERTES`, et un simple avertissement
 * si la variable manque.
 *
 * Le lien se construit ici, seul endroit qui connaisse l'adresse de
 * l'application et la route de l'écran.
 */
export type RetourAAnnoncer = Omit<AlerteDeRetourPayload, "lien">;

export async function envoyerLAlerteDeRetour(retour: RetourAAnnoncer): Promise<void> {
  const destinataire = process.env.EMAIL_ALERTES?.trim();

  if (!destinataire) {
    console.warn("[retour] alerte non envoyée : EMAIL_ALERTES absente de l'environnement.");
    return;
  }

  const email = composerLAlerteDeRetour({
    ...retour,
    lien: `${adresseDeLApp()}${ROUTES.adminRetours}`,
  });

  await envoyerLEmail({
    to: destinataire,
    subject: email.subject,
    html: email.html,
    text: email.text,
  });
}
