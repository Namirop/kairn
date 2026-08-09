/**
 * Gabarit commun des emails.
 *
 * Les couleurs sont écrites en dur ici, contrairement au reste du projet : les
 * clients mail ne savent pas lire une variable CSS, et beaucoup suppriment les
 * feuilles de style externes. Ce fichier est le seul endroit où elles sont
 * dupliquées ; il suit `app/globals.css`.
 */
const PALETTE = {
  paper: "#F2F2EF",
  surface: "#FFFFFF",
  border: "#E4E4DF",
  muted: "#6E7370",
  ink: "#16191A",
  lichen: "#7A8B4F",
  ember: "#B4552F",
} as const;

const SANS = "ui-sans-serif, system-ui, 'Segoe UI', Helvetica, Arial, sans-serif";
const MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

export const EMAIL_STYLE = { ...PALETTE, SANS, MONO } as const;

export type ShellContent = {
  preheader: string;
  body: string;
  unsubscribeUrl: string;
};

/** Enveloppe le contenu : largeur fixe, fond papier, pied de désinscription. */
export function renderShell({ preheader, body, unsubscribeUrl }: ShellContent): string {
  return `<!doctype html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:${PALETTE.paper};font-family:${SANS};color:${PALETTE.ink};">
<span style="display:none;font-size:1px;color:${PALETTE.paper};">${preheader}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${PALETTE.paper};padding:32px 16px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:${PALETTE.surface};border:1px solid ${PALETTE.border};">
<tr><td style="padding:32px 28px;">
<div style="font-family:${MONO};font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:${PALETTE.muted};padding-bottom:24px;">Cairn</div>
${body}
</td></tr>
</table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;">
<tr><td style="padding:20px 28px;font-size:12px;line-height:18px;color:${PALETTE.muted};">
Tu reçois ce message parce que le rappel quotidien est activé sur ton compte.
<a href="${unsubscribeUrl}" style="color:${PALETTE.muted};">Ne plus en recevoir</a>.
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}
