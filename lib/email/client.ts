import { Resend } from "resend";

/**
 * Le seul fichier qui importe Resend.
 *
 * Sans `RESEND_API_KEY`, rien ne part : l'email est écrit dans les journaux avec
 * son destinataire et son objet, jamais son contenu. C'est ce qui permet de
 * développer toute la chaîne de notification sans compte fournisseur.
 */

export type OutgoingEmail = {
  to: string;
  subject: string;
  html: string;
  text: string;
  headers?: Record<string, string>;
};

/** Identifiant rendu par le fournisseur, `null` quand rien n'est parti. */
export type DeliveryResult = { sent: boolean; providerId: string | null };

let cached: Resend | null = null;

function resend(apiKey: string): Resend {
  cached ??= new Resend(apiKey);
  return cached;
}

export async function sendEmail(email: OutgoingEmail): Promise<DeliveryResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || !from) {
    console.info(`Email non envoyé (fournisseur non configuré) — « ${email.subject} »`);
    return { sent: false, providerId: null };
  }

  const { data, error } = await resend(apiKey).emails.send({
    from,
    to: email.to,
    subject: email.subject,
    html: email.html,
    text: email.text,
    headers: email.headers,
  });

  if (error) {
    throw new Error(`Envoi refusé par Resend : ${error.message}`);
  }

  return { sent: true, providerId: data?.id ?? null };
}
