import type { Langue } from "@/lib/db/types";
import { textesDEmail } from "../traduction";
import { STYLE_DES_EMAILS, envelopper, type EmailRendu } from "./gabarit";

/**
 * Le code qui ouvre une session. Un code, pas un lien : un lien s'ouvre dans le
 * navigateur par défaut, jamais dans l'application installée (voir
 * `lib/domain/code-de-connexion.ts`).
 *
 * Le mot « code » précède les chiffres exprès : iOS et Android s'appuient sur
 * lui pour proposer le code au-dessus du clavier.
 *
 * Les chiffres sont espacés à la lecture mais écrits d'un bloc : une sélection
 * les rapporte sans séparateur.
 */

export type CodeDeConnexionPayload = {
  /** Le code tel qu'il a été émis, six chiffres. */
  code: string;
  /** Minutes de validité, telles que la configuration les fixe. */
  minutes: number;
};

export function composerLeCodeDeConnexion(
  { code, minutes }: CodeDeConnexionPayload,
  langue: Langue,
): EmailRendu {
  const t = textesDEmail(langue);
  const { SANS, MONO, encre, secondaire, filet, ombre } = STYLE_DES_EMAILS;

  // i18n-ignore — balisage HTML ; ses textes viennent de t().
  const corps = `
<p style="margin:0 0 20px;font-family:${SANS};font-size:15px;line-height:24px;color:${encre};">
${t("code.intro")}
</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;background:${ombre};border:1px solid ${filet};">
<tr><td align="center" style="padding:20px 16px;">
<div style="font-family:${MONO};font-size:32px;line-height:40px;font-weight:600;letter-spacing:0.22em;color:${encre};text-indent:0.22em;">${code}</div>
</td></tr>
</table>
<p style="margin:0 0 8px;font-family:${SANS};font-size:13px;line-height:20px;color:${secondaire};">
${t("code.retape", { minutes })}
</p>
<p style="margin:0;font-family:${SANS};font-size:13px;line-height:20px;color:${secondaire};">
${t("code.ignore")}
</p>`;

  return {
    subject: t("code.sujet", { code }),
    html: envelopper({
      preentete: t("code.preheader", { code }),
      corps,
      // Ni désinscription ni raison d'envoi : cet email vient d'être demandé.
      langue,
    }),
    text: `${t("code.intro")}\n\n${t("code.ligneCode", { code })}\n\n${t("code.retape", { minutes })}\n${t("code.ignoreCourt")}`,
  };
}
