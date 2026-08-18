import { sendEmail } from "./client";
import { renderAlerteDePlafond, type AlerteDePlafondPayload } from "./templates/alerte-de-plafond";

/**
 * L'envoi d'une alerte de plafond.
 *
 * Il ne passe **pas** par `sendNotification`, et c'est le point important de ce
 * fichier. Cette fonction-là vérifie le refus d'emails d'un utilisateur et écrit
 * dans `EmailDelivery` — deux comportements justes pour un rappel quotidien et
 * absurdes ici : il n'y a pas d'utilisateur derrière cette alerte, elle s'adresse
 * à qui tient le produit, et personne ne doit pouvoir la couper depuis un écran
 * de réglages. Même raison que pour le lien de connexion, voir `connexion.ts`.
 *
 * **Le destinataire est une variable, jamais une adresse en dur.** Sans
 * `EMAIL_ALERTES`, on trace et on s'arrête : le silence est ici la bonne réponse,
 * parce que l'alternative — lever — ferait échouer la réservation qu'on est en
 * train de surveiller. C'est exactement le défaut que cette fiche corrige, on ne
 * va pas l'introduire dans le correctif.
 */
export async function envoyerLAlerteDePlafond(payload: AlerteDePlafondPayload): Promise<void> {
  const destinataire = process.env.EMAIL_ALERTES?.trim();

  if (!destinataire) {
    console.warn("[plafond] alerte non envoyée : EMAIL_ALERTES absente de l'environnement.");
    return;
  }

  const email = renderAlerteDePlafond(payload);

  await sendEmail({
    to: destinataire,
    subject: email.subject,
    html: email.html,
    text: email.text,
    // Aucun en-tête de désabonnement : ce n'est pas un envoi périodique, et le
    // destinataire n'est pas un compte.
  });
}
