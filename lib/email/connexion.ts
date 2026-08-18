import { LONGUEUR_DU_CODE } from "@/lib/domain/code-de-connexion";
import { sendEmail } from "./client";
import { renderCodeDeConnexion } from "./templates/code-de-connexion";

/**
 * L'envoi d'un code de connexion.
 *
 * Il ne passe **pas** par `sendNotification`, et c'est le point important de ce
 * fichier : cette fonction-là vérifie le refus d'emails de l'utilisateur, ce qui
 * est juste pour un rappel quotidien et catastrophique ici. Quelqu'un qui a
 * coupé ses rappels doit évidemment pouvoir encore entrer dans son compte — le
 * contraire l'enfermerait dehors avec un bouton qu'il a cliqué en toute bonne
 * foi.
 *
 * Il n'écrit rien non plus dans `EmailDelivery` : cette table existe pour rendre
 * un cron idempotent, un par type et par jour. Un code de connexion se demande
 * autant de fois qu'on veut, et deux demandes dans la même journée doivent
 * partir toutes les deux.
 */

/**
 * Durée de validité d'un code, en minutes.
 *
 * Plus courte que celle du lien qu'il remplace : six chiffres se devinent, là où
 * un jeton signé ne se devine pas. La fenêtre étroite fait le gros du travail,
 * le compte de tentatives fait le reste — voir `lib/auth/config.ts`.
 */
export const MINUTES_DE_VALIDITE = 10;

export async function envoyerLeCodeDeConnexion(destinataire: string, code: string): Promise<void> {
  if (code.length !== LONGUEUR_DU_CODE) {
    // Un code de longueur inattendue veut dire que la configuration du plugin a
    // divergé de ce que l'écran de saisie attend : il vaut mieux ne pas partir.
    throw new Error(`Code de connexion de longueur inattendue : ${code.length}.`);
  }

  const email = renderCodeDeConnexion({ code, minutes: MINUTES_DE_VALIDITE });

  await sendEmail({
    to: destinataire,
    subject: email.subject,
    html: email.html,
    text: email.text,
    // Aucun en-tête de désabonnement : voir `code-de-connexion.ts`.
  });
}
