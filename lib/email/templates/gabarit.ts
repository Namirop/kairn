import type { Langue } from "@/lib/db/types";
import { LOCALE } from "@/lib/i18n/langues";
import { textesDEmail } from "../traduction";
import { echapper } from "./echapper";

/**
 * En dur : les clients mail ne lisent pas les variables CSS. Suit
 * `app/styles/tokens/couleurs.css` : papier posé sur l'ombre, jamais de blanc pur.
 */
const PALETTE = {
  ombre: "#CFE3EC",
  papier: "#EEF5F7",
  filet: "#7FB3C8",
  secondaire: "#345770",
  encre: "#0D2236",
  /** Un geste est ce que le produit demande, pas une maîtrise : pas de lichen (1,9 pour 1). */
  accent: "#1B4FC4",
  /** Le seul blanc pur des emails, jamais une surface. */
  surAccent: "#FFFFFF",
  ember: "#B4552F",
  /** Sémantique : un échec n'est pas un accent. */
  alerte: "#9A3B2C",
} as const;

// i18n-ignore — pile de polices CSS.
const SANS = "ui-sans-serif, system-ui, 'Segoe UI', Helvetica, Arial, sans-serif";
const MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

export const STYLE_DES_EMAILS = { ...PALETTE, SANS, MONO } as const;

/** Le libellé reprend le mot de l'interface, le même dans tout le flux. */
export function bouton(href: string, libelle: string): string {
  return `<a href="${href}" style="display:inline-block;background:${PALETTE.accent};color:${PALETTE.surAccent};text-decoration:none;padding:12px 20px;font-size:15px;">${libelle}</a>`;
}

export type EmailRendu = { subject: string; html: string; text: string };

export type ContenuDuGabarit = {
  preentete: string;
  corps: string;
  /** Absent sur un transactionnel : un `List-Unsubscribe` le rangerait avec les envois de masse. */
  lienDeDesinscription?: string;
  /** Sans lui, le pied disparaît. */
  raisonDeLEnvoi?: string;
  /** Facultative : les alertes d'exploitation n'ont qu'un lecteur, francophone. */
  langue?: Langue;
};

export function envelopper({
  preentete,
  corps,
  lienDeDesinscription,
  raisonDeLEnvoi,
  langue = "FR",
}: ContenuDuGabarit): string {
  const t = textesDEmail(langue);
  const pied = lienDeDesinscription
    ? `${raisonDeLEnvoi ?? t("pied.raisonParDefaut")}
<a href="${lienDeDesinscription}" style="color:${PALETTE.secondaire};">${t("pied.nePlusEnRecevoir")}</a>.`
    : (raisonDeLEnvoi ?? "");

  // i18n-ignore — balisage HTML ; le pied et la langue viennent de t() et de LOCALE.
  return `<!doctype html>
<html lang="${LOCALE[langue]}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:${PALETTE.ombre};font-family:${SANS};color:${PALETTE.encre};">
<span style="display:none;font-size:1px;color:${PALETTE.ombre};">${echapper(preentete)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${PALETTE.ombre};padding:32px 16px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:${PALETTE.papier};border:1px solid ${PALETTE.filet};">
<tr><td style="padding:32px 28px;">
<div style="font-family:${SANS};font-size:17px;font-weight:600;letter-spacing:-0.01em;color:${PALETTE.encre};padding-bottom:24px;">Kairn</div>
${corps}
</td></tr>
</table>
${
  pied
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;">
<tr><td style="padding:20px 28px;font-size:12px;line-height:18px;color:${PALETTE.secondaire};">
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
