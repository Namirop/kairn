import { EMAIL_STYLE, renderShell } from "./shell";

/**
 * Le lien qui ouvre une session.
 *
 * Il remplace le mot de passe, et pas seulement pour le confort : Kairn écrit
 * tous les jours à ses utilisateurs, donc l'adresse doit être valide et vérifiée
 * dès le premier jour. Un lien par email le garantit par construction — on ne
 * peut pas entrer sans avoir prouvé qu'on relève cette boîte — là où un mot de
 * passe demande une étape de vérification séparée qu'on repousse toujours.
 *
 * L'email ne porte **pas** de lien de désinscription. C'est un envoi
 * transactionnel, demandé à l'instant, et qui est le moyen d'entrer : proposer
 * d'y renoncer n'aurait aucun sens, et un `List-Unsubscribe` ferait ranger un
 * message d'accès avec les envois de masse.
 */

export type LienDeConnexionPayload = {
  url: string;
  /** Minutes de validité, telles que la configuration les fixe. */
  minutes: number;
};

export type EmailRendu = { subject: string; html: string; text: string };

export function renderLienDeConnexion({ url, minutes }: LienDeConnexionPayload): EmailRendu {
  const { SANS, ink, muted, lichen } = EMAIL_STYLE;

  const body = `
<p style="margin:0 0 16px;font-family:${SANS};font-size:15px;line-height:24px;color:${ink};">
Voici ton lien pour entrer dans Kairn.
</p>
<p style="margin:0 0 24px;">
<a href="${url}" style="display:inline-block;background:${lichen};color:#F2F2EF;font-family:${SANS};font-size:15px;font-weight:600;text-decoration:none;padding:12px 20px;">Ouvrir Kairn</a>
</p>
<p style="margin:0 0 8px;font-family:${SANS};font-size:13px;line-height:20px;color:${muted};">
Il fonctionne une seule fois et expire dans ${minutes} minutes.
</p>
<p style="margin:0;font-family:${SANS};font-size:13px;line-height:20px;color:${muted};">
Si tu n'as pas demandé ce lien, ignore ce message : personne ne peut entrer sans lui.
</p>`;

  return {
    subject: "Ton lien pour entrer dans Kairn",
    html: renderShell({
      preheader: "Un lien à usage unique pour ouvrir ta session.",
      body,
      // Ni désinscription ni raison d'envoi : cet email a été demandé il y a
      // quelques secondes, et sa raison d'être est dans son objet.
    }),
    text: `Voici ton lien pour entrer dans Kairn.\n\n${url}\n\nIl fonctionne une seule fois et expire dans ${minutes} minutes.\nSi tu n'as pas demandé ce lien, ignore ce message.`,
  };
}
