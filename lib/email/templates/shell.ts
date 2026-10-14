import type { Langue } from "@/lib/db/types";
import { LOCALE } from "@/lib/i18n/langues";
import { textesDEmail } from "../traduction";

/**
 * Gabarit commun des emails.
 *
 * Les couleurs sont en dur parce que les clients mail ne lisent pas les
 * variables CSS ; elles suivent `app/styles/tokens/colors.css`. Composition du
 * produit : un fond d'ombre, une surface de papier posée dessus, jamais de
 * blanc pur.
 */
const PALETTE = {
  paper: "#CFE3EC",
  surface: "#EEF5F7",
  border: "#7FB3C8",
  muted: "#345770",
  ink: "#0D2236",
  /**
   * Les boutons portent l'accent : un geste est ce que le produit demande, pas
   * une maîtrise. Du blanc sur le lichen saturé tomberait à 1,9 pour 1.
   */
  accent: "#1B4FC4",
  ember: "#B4552F",
  /// Sémantique, et pas la couleur du produit : un échec n'est pas un accent.
  alerte: "#9A3B2C",
} as const;

// i18n-ignore — pile de polices CSS.
const SANS = "ui-sans-serif, system-ui, 'Segoe UI', Helvetica, Arial, sans-serif";
const MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

export const EMAIL_STYLE = { ...PALETTE, SANS, MONO } as const;

export type ShellContent = {
  preheader: string;
  body: string;
  /**
   * Absent sur un email dont on ne peut pas se désabonner, comme le code de
   * connexion : un `List-Unsubscribe` y ferait ranger un message transactionnel
   * avec les envois de masse.
   */
  unsubscribeUrl?: string;
  /** Ce qui justifie l'envoi, dit au pied. Sans lui, le pied disparaît. */
  raisonDeLEnvoi?: string;
  /**
   * La langue du destinataire, pour le `lang` du document et le pied.
   * Facultative : les alertes d'exploitation n'ont qu'un lecteur, en français.
   */
  langue?: Langue;
};

/** Enveloppe le contenu : largeur fixe, fond papier, pied de désinscription. */
export function renderShell({
  preheader,
  body,
  unsubscribeUrl,
  raisonDeLEnvoi,
  langue = "FR",
}: ShellContent): string {
  const t = textesDEmail(langue);
  const pied = unsubscribeUrl
    ? `${raisonDeLEnvoi ?? t("pied.raisonParDefaut")}
<a href="${unsubscribeUrl}" style="color:${PALETTE.muted};">${t("pied.nePlusEnRecevoir")}</a>.`
    : (raisonDeLEnvoi ?? "");

  // i18n-ignore — balisage HTML ; le pied et la langue viennent de t() et de LOCALE.
  return `<!doctype html>
<html lang="${LOCALE[langue]}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:${PALETTE.paper};font-family:${SANS};color:${PALETTE.ink};">
<span style="display:none;font-size:1px;color:${PALETTE.paper};">${preheader}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${PALETTE.paper};padding:32px 16px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:${PALETTE.surface};border:1px solid ${PALETTE.border};">
<tr><td style="padding:32px 28px;">
<div style="font-family:${SANS};font-size:17px;font-weight:600;letter-spacing:-0.01em;color:${PALETTE.ink};padding-bottom:24px;">Kairn</div>
${body}
</td></tr>
</table>
${
  pied
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;">
<tr><td style="padding:20px 28px;font-size:12px;line-height:18px;color:${PALETTE.muted};">
${pied}
</td></tr>
</table>`
    : ""
}
</td></tr>
</table>
</body>
</html>`;
}
