import { ROUTES } from "@/lib/auth/routes";
import { sendEmail } from "./client";
import { renderAlerteDeRetour, type AlerteDeRetourPayload } from "./templates/alerte-de-retour";

/**
 * L'envoi d'une alerte de retour. Même règle que les deux autres alertes
 * d'exploitation : elle ne passe pas par `sendNotification`, le destinataire est
 * `EMAIL_ALERTES` en variable d'environnement, et son absence fait un silence
 * propre plutôt qu'une erreur.
 *
 * Le lien est construit ici et pas dans le gabarit : c'est le seul endroit qui
 * connaisse à la fois l'adresse de l'application et le nom de l'écran.
 */
export type RetourAAnnoncer = Omit<AlerteDeRetourPayload, "lien">;

function baseUrl(): string {
  return (process.env.BETTER_AUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

export async function envoyerLAlerteDeRetour(retour: RetourAAnnoncer): Promise<void> {
  const destinataire = process.env.EMAIL_ALERTES?.trim();

  if (!destinataire) {
    console.warn("[retour] alerte non envoyée : EMAIL_ALERTES absente de l'environnement.");
    return;
  }

  const email = renderAlerteDeRetour({ ...retour, lien: `${baseUrl()}${ROUTES.adminRetours}` });

  await sendEmail({
    to: destinataire,
    subject: email.subject,
    html: email.html,
    text: email.text,
  });
}
