import { EMAIL_STYLE as S, renderShell } from "./shell";
import type { RenderedEmail } from "./daily-reminder";

/**
 * L'alerte d'exploitation quand un webhook de paiement n'aboutit pas.
 *
 * **C'est la seule panne du produit qui coûte de l'argent à quelqu'un
 * d'autre.** Quand le webhook échoue, Stripe a encaissé et Kairn n'a rien
 * écrit : le compte reste gratuit alors qu'il est payé. Stripe relance pendant
 * trois jours puis renonce, et pendant ce temps le seul signe est une ligne de
 * journal que personne n'ouvre. La personne, elle, voit « Gratuit » sur son
 * écran de réglages et n'a aucune raison de penser à écrire.
 *
 * L'email dit donc les trois choses qui permettent d'agir sans ouvrir quoi que
 * ce soit : quel type d'événement, ce que l'erreur raconte, et où aller le
 * rejouer. Le tableau de bord Stripe garde chaque livraison et sait la
 * renvoyer — c'est la réparation, et elle tient en un clic une fois qu'on sait.
 *
 * Aucun désabonnement, même règle que les autres alertes d'exploitation.
 */

export type AlerteDePaiementPayload = {
  /** Le type d'événement Stripe qui a échoué, ou « inconnu » si le corps ne s'est pas lu. */
  type: string;
  /** Le code d'erreur du produit quand il y en a un — `PAIEMENT_RAPPORT_ILLISIBLE`, etc. */
  code: string;
  /** Ce que l'erreur dit, coupé : c'est un indice, pas la trace complète. */
  motif: string;
  /** L'instant de l'alerte, pour dire l'heure qu'il est en UTC. */
  instant: Date;
};

/** Assez pour reconnaître la panne, pas assez pour faire un email de trace. */
const MOTIF_MAXIMUM = 500;

function heureUtc(instant: Date): string {
  return `${instant.toISOString().slice(11, 16)} UTC`;
}

export function renderAlerteDePaiement(payload: AlerteDePaiementPayload): RenderedEmail {
  const { type, code, motif, instant } = payload;

  const constat =
    "Stripe a encaissé et Kairn n'a rien écrit : ce compte reste gratuit alors qu'il est payé. Stripe relance pendant trois jours, puis renonce.";
  const reparation =
    "Le tableau de bord Stripe garde chaque livraison et sait la renvoyer : Developers → Webhooks → l'endpoint → l'événement → Resend.";

  const lignes: [string, string][] = [
    [type, "type d'événement"],
    [code, "code de l'échec"],
    [heureUtc(instant), "heure de la première alerte du jour"],
  ];

  const tableau = lignes
    .map(
      ([valeur, legende]) =>
        `<tr><td style="padding:0 12px 8px 0;font-family:${S.MONO};font-size:15px;color:${S.ink};white-space:nowrap;">${valeur}</td><td style="padding:0 0 8px;font-size:14px;color:${S.muted};">${legende}</td></tr>`,
    )
    .join("");

  const motifCourt = motif.length > MOTIF_MAXIMUM ? `${motif.slice(0, MOTIF_MAXIMUM)}…` : motif;

  const body = `<p style="margin:0 0 24px;font-family:${S.MONO};font-size:13px;color:${S.alerte};">Webhook de paiement en échec</p>
<p style="margin:0 0 24px;font-size:15px;line-height:23px;color:${S.muted};">${constat}</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">${tableau}</table>
<p style="margin:0 0 4px;font-size:14px;color:${S.muted};">Ce que l'erreur dit :</p>
<p style="margin:0 0 24px;font-family:${S.MONO};font-size:13px;line-height:19px;color:${S.ink};word-break:break-all;">${motifCourt}</p>
<p style="margin:0;font-size:15px;line-height:23px;color:${S.muted};">${reparation}</p>`;

  const text = [
    "Webhook de paiement en échec.",
    "",
    constat,
    "",
    `Type : ${type}`,
    `Code : ${code}`,
    `Heure : ${heureUtc(instant)}`,
    "",
    `Ce que l'erreur dit : ${motifCourt}`,
    "",
    reparation,
  ].join("\n");

  return {
    subject: `Kairn — webhook de paiement en échec (${type})`,
    html: renderShell({
      preheader: `${type} n'a pas pu être traité, ${heureUtc(instant)}.`,
      body,
      raisonDeLEnvoi:
        "Alerte d'exploitation. Elle part une fois par jour au plus, à l'adresse posée dans EMAIL_ALERTES.",
    }),
    text,
  };
}
