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

export type EmailSortant = {
  to: string;
  subject: string;
  html: string;
  text: string;
  headers?: Record<string, string>;
};

/** Identifiant rendu par le fournisseur, `null` quand rien n'est parti. */
export type ResultatDEnvoi = { sent: boolean; providerId: string | null };

let enCache: Resend | null = null;

function resend(cle: string): Resend {
  enCache ??= new Resend(cle);
  return enCache;
}

export async function envoyerLEmail(email: EmailSortant): Promise<ResultatDEnvoi> {
  const cle = process.env.RESEND_API_KEY;
  const expediteur = process.env.EMAIL_FROM;

  if (!cle || !expediteur) {
    const manquantes = [
      ...(cle ? [] : ["RESEND_API_KEY"]),
      ...(expediteur ? [] : ["EMAIL_FROM"]),
    ].join(" et ");

    if (process.env.NODE_ENV === "production") {
      throw new Error(`Envoi impossible : ${manquantes} absente de l'environnement.`);
    }

    console.info(`Email non envoyé (${manquantes} absente) — « ${email.subject} »`);
    return { sent: false, providerId: null };
  }

  const { data, error } = await resend(cle).emails.send({
    from: expediteur,
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
