import { envoyerLEmail } from "./client";
import type { EmailRendu } from "./templates/gabarit";

/**
 * L'envoi commun des alertes d'exploitation, à qui tient le produit.
 *
 * Pas de `envoyerLaNotification` : il vérifie le refus d'emails d'un utilisateur et
 * écrit dans `EmailDelivery`, alors qu'il n'y a pas d'utilisateur derrière
 * ces alertes (même raison que `connexion.ts`).
 *
 * Sans `EMAIL_ALERTES`, on trace et on s'arrête : lever ferait échouer
 * l'opération qu'on surveille. L'email ne se compose qu'une fois l'adresse
 * connue.
 *
 * Aucun en-tête de désabonnement : ce n'est pas un envoi périodique, et le
 * destinataire n'est pas un compte.
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
