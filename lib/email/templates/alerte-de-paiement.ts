// i18n-ignore-fichier — outil de l'administrateur, qui reste en français par décision du 08/10/2026.
import { echapper } from "./echapper";
import { STYLE_DES_EMAILS as S, envelopper, type EmailRendu } from "./gabarit";
import { heureUtc, lignesDeValeurs } from "./blocs-d-alerte";

/**
 * L'alerte d'exploitation quand un webhook de paiement n'aboutit pas : Stripe a
 * encaissé, le compte reste gratuit, et Stripe renonce après trois jours de
 * relances. Sans cet email, le seul signe serait une ligne de journal.
 *
 * Il dit de quoi agir sans rien ouvrir : le type d'événement, l'erreur, et où
 * le rejouer depuis le tableau de bord Stripe.
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

export function composerLAlerteDePaiement(payload: AlerteDePaiementPayload): EmailRendu {
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

  const tableau = lignesDeValeurs(lignes);

  const motifCourt = motif.length > MOTIF_MAXIMUM ? `${motif.slice(0, MOTIF_MAXIMUM)}…` : motif;

  const corps = `<p style="margin:0 0 24px;font-family:${S.MONO};font-size:13px;color:${S.alerte};">Webhook de paiement en échec</p>
<p style="margin:0 0 24px;font-size:15px;line-height:23px;color:${S.secondaire};">${constat}</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">${tableau}</table>
<p style="margin:0 0 4px;font-size:14px;color:${S.secondaire};">Ce que l'erreur dit :</p>
<p style="margin:0 0 24px;font-family:${S.MONO};font-size:13px;line-height:19px;color:${S.encre};word-break:break-all;">${echapper(motifCourt)}</p>
<p style="margin:0;font-size:15px;line-height:23px;color:${S.secondaire};">${reparation}</p>`;

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
    html: envelopper({
      preentete: `${type} n'a pas pu être traité, ${heureUtc(instant)}.`,
      corps,
      raisonDeLEnvoi:
        "Alerte d'exploitation. Elle part une fois par jour au plus, à l'adresse posée dans EMAIL_ALERTES.",
    }),
    text,
  };
}
