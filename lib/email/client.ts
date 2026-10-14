import { Resend } from "resend";

/**
 * Le seul fichier qui importe Resend.
 *
 * En développement, sans `RESEND_API_KEY`, rien ne part : l'objet est
 * journalisé, jamais le contenu. Celui du code de connexion porte le code,
 * c'est là qu'on le lit pour se connecter en local.
 *
 * En production, ce chemin lève : l'écran annoncerait « code envoyé » et
 * personne ne pourrait entrer sans que rien ne le signale. Le code ne peut donc
 * pas s'y retrouver dans un journal.
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
    const manquantes = [
      ...(apiKey ? [] : ["RESEND_API_KEY"]),
      ...(from ? [] : ["EMAIL_FROM"]),
    ].join(" et ");

    if (process.env.NODE_ENV === "production") {
      throw new Error(`Envoi impossible : ${manquantes} absente de l'environnement.`);
    }

    console.info(`Email non envoyé (${manquantes} absente) — « ${email.subject} »`);
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
