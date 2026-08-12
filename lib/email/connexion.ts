import { sendEmail } from "./client";
import { renderLienDeConnexion } from "./templates/lien-de-connexion";

/**
 * L'envoi d'un lien de connexion.
 *
 * Il ne passe **pas** par `sendNotification`, et c'est le point important de ce
 * fichier : cette fonction-là vérifie le refus d'emails de l'utilisateur, ce qui
 * est juste pour un rappel quotidien et catastrophique ici. Quelqu'un qui a
 * coupé ses rappels doit évidemment pouvoir encore entrer dans son compte — le
 * contraire l'enfermerait dehors avec un bouton qu'il a cliqué en toute bonne
 * foi.
 *
 * Il n'écrit rien non plus dans `EmailDelivery` : cette table existe pour rendre
 * un cron idempotent, un par type et par jour. Un lien de connexion se demande
 * autant de fois qu'on veut, et deux demandes dans la même journée doivent
 * partir toutes les deux.
 */

/** Durée de validité d'un lien, en minutes. Courte : c'est une clé qui traîne. */
export const MINUTES_DE_VALIDITE = 15;

export async function envoyerLeLienDeConnexion(destinataire: string, url: string): Promise<void> {
  const email = renderLienDeConnexion({ url, minutes: MINUTES_DE_VALIDITE });

  await sendEmail({
    to: destinataire,
    subject: email.subject,
    html: email.html,
    text: email.text,
    // Aucun en-tête de désabonnement : voir `lien-de-connexion.ts`.
  });
}
