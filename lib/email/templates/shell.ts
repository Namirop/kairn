/**
 * Gabarit commun des emails.
 *
 * Les couleurs sont écrites en dur ici, contrairement au reste du projet : les
 * clients mail ne savent pas lire une variable CSS, et beaucoup suppriment les
 * feuilles de style externes. Ce fichier est le seul endroit où elles sont
 * dupliquées ; il suit `app/globals.css`.
 *
 * L'email reprend la composition du produit : un fond d'ombre, une surface de
 * papier posée dessus. Le blanc pur n'existe nulle part dans Kairn.
 */
const PALETTE = {
  paper: "#CFE3EC",
  surface: "#EEF5F7",
  border: "#7FB3C8",
  muted: "#345770",
  ink: "#0D2236",
  /**
   * L'accent du produit, et c'est bien lui que portent les boutons.
   *
   * Il s'appelait `lichen`, et il peignait le seul geste de chaque email. Le
   * lichen ne tient plus que la maîtrise : un bouton n'est pas une maîtrise,
   * c'est ce que le produit demande. Le nom suit le métier — et au passage,
   * du blanc sur le lichen saturé donnait 1,9 pour 1, c'est-à-dire un libellé
   * illisible sur le seul lien qui compte.
   */
  accent: "#1B4FC4",
  ember: "#B4552F",
  /// Sémantique, et pas la couleur du produit : un échec n'est pas un accent.
  alerte: "#9A3B2C",
} as const;

const SANS = "ui-sans-serif, system-ui, 'Segoe UI', Helvetica, Arial, sans-serif";
const MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

export const EMAIL_STYLE = { ...PALETTE, SANS, MONO } as const;

export type ShellContent = {
  preheader: string;
  body: string;
  /**
   * Absent sur un email dont on ne peut pas se désabonner.
   *
   * Un lien de connexion en est un : il ne s'envoie que sur demande, il est le
   * moyen d'entrer, et proposer d'y renoncer n'aurait aucun sens. Y coller un
   * `List-Unsubscribe` serait pire — le client mail rangerait un message
   * transactionnel avec les envois de masse.
   */
  unsubscribeUrl?: string;
  /** Ce qui justifie l'envoi, dit au pied. Sans lui, le pied disparaît. */
  raisonDeLEnvoi?: string;
};

/** Enveloppe le contenu : largeur fixe, fond papier, pied de désinscription. */
export function renderShell({
  preheader,
  body,
  unsubscribeUrl,
  raisonDeLEnvoi,
}: ShellContent): string {
  const pied = unsubscribeUrl
    ? `${raisonDeLEnvoi ?? "Tu reçois ce message parce que le rappel quotidien est activé sur ton compte."}
<a href="${unsubscribeUrl}" style="color:${PALETTE.muted};">Ne plus en recevoir</a>.`
    : (raisonDeLEnvoi ?? "");

  return `<!doctype html>
<html lang="fr">
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
