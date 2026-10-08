import type { Langue } from "@/lib/db/types";
import { textesDEmail } from "../traduction";
import { EMAIL_STYLE, renderShell } from "./shell";

/**
 * Le code qui ouvre une session.
 *
 * Il a remplacé le lien parce qu'un lien part du client mail, donc du navigateur
 * par défaut, et jamais de l'application installée — voir
 * `lib/domain/code-de-connexion.ts` pour le détail. Un code se retape dans la
 * fenêtre qui l'a demandé, et cette fenêtre est celle où l'on veut la session.
 *
 * **Le mot « code » précède les chiffres, et ce n'est pas une tournure.** iOS
 * comme Android proposent un code à usage unique au-dessus du clavier quand ils
 * le reconnaissent dans un message, et leur reconnaissance s'appuie sur ce
 * mot-là près des chiffres. C'est ce qui rend la saisie sans effort sur mobile,
 * bien plus qu'un bouton coller — l'écran garde les deux.
 *
 * Les chiffres sont espacés à la lecture mais **écrits d'un bloc** : une
 * sélection les rapporte sans séparateur, et le champ les relit de toute façon.
 *
 * L'email ne porte pas de lien de désinscription. C'est un envoi transactionnel,
 * demandé à l'instant, et qui est le moyen d'entrer : proposer d'y renoncer
 * n'aurait aucun sens, et un `List-Unsubscribe` ferait ranger un message d'accès
 * avec les envois de masse.
 */

export type CodeDeConnexionPayload = {
  /** Le code tel qu'il a été émis, six chiffres. */
  code: string;
  /** Minutes de validité, telles que la configuration les fixe. */
  minutes: number;
};

export type EmailRendu = { subject: string; html: string; text: string };

export function renderCodeDeConnexion(
  { code, minutes }: CodeDeConnexionPayload,
  langue: Langue,
): EmailRendu {
  const t = textesDEmail(langue);
  const { SANS, MONO, ink, muted, border, paper } = EMAIL_STYLE;

  // i18n-ignore — balisage HTML ; ses textes viennent de t().
  const body = `
<p style="margin:0 0 20px;font-family:${SANS};font-size:15px;line-height:24px;color:${ink};">
${t("code.intro")}
</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;background:${paper};border:1px solid ${border};">
<tr><td align="center" style="padding:20px 16px;">
<div style="font-family:${MONO};font-size:32px;line-height:40px;font-weight:600;letter-spacing:0.22em;color:${ink};text-indent:0.22em;">${code}</div>
</td></tr>
</table>
<p style="margin:0 0 8px;font-family:${SANS};font-size:13px;line-height:20px;color:${muted};">
${t("code.retape", { minutes })}
</p>
<p style="margin:0;font-family:${SANS};font-size:13px;line-height:20px;color:${muted};">
${t("code.ignore")}
</p>`;

  return {
    subject: t("code.sujet", { code }),
    html: renderShell({
      preheader: t("code.preheader", { code }),
      body,
      // Ni désinscription ni raison d'envoi : cet email a été demandé il y a
      // quelques secondes, et sa raison d'être est dans son objet.
      langue,
    }),
    text: `${t("code.intro")}\n\n${t("code.ligneCode", { code })}\n\n${t("code.retape", { minutes })}\n${t("code.ignoreCourt")}`,
  };
}
