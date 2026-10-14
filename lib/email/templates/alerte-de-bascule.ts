// i18n-ignore-fichier — outil de l'administrateur, qui reste en français.
import { STYLE_DES_EMAILS as S, envelopper, type EmailRendu } from "./gabarit";
import { echapper } from "./echapper";

/**
 * L'alerte d'exploitation quand les bascules Luna → Sonnet s'accumulent.
 *
 * Elle dit, sans ouvrir le tableau de bord, le nombre de bascules du jour
 * contre le seuil, le motif de la dernière, et la variable qui change de
 * lignée sans commit : `AI_FOURNISSEUR=anthropic` restaure Sonnet natif.
 *
 * Le repli tient les dépôts, mais au-delà du seuil c'est le fournisseur qu'il
 * faut regarder.
 *
 * Aucun désabonnement, comme l'alerte de plafond.
 */

export type AlerteDeBasculePayload = {
  /** Combien de bascules aujourd'hui, seuil compris. */
  bascules: number;
  /** Le seuil dépassé (`SEUIL_BASCULES`). */
  seuil: number;
  /**
   * Motif de la dernière bascule (l'échec Luna qui a déclenché l'alerte).
   * Coupé à 500 caractères — c'est un indice, pas la trace complète.
   */
  motif: string;
  /** L'instant de l'alerte, pour dire l'heure qu'il est en UTC. */
  instant: Date;
};

function heureUtc(instant: Date): string {
  return `${instant.toISOString().slice(11, 16)} UTC`;
}

function sujet({ bascules }: AlerteDeBasculePayload): string {
  return `Kairn — ${bascules} bascules Luna → Sonnet aujourd'hui`;
}

export function composerLAlerteDeBascule(payload: AlerteDeBasculePayload): EmailRendu {
  const { bascules, seuil, motif, instant } = payload;

  const constat =
    "Le repli sert : les dépôts continuent de partir. Mais Luna tombe plus souvent que le seuil accepté, il faut regarder ce qu'il fait.";

  const lignes: [string, string][] = [
    [String(bascules), `bascules aujourd'hui (seuil ${seuil})`],
    [heureUtc(instant), "heure de la journée qui compte"],
    ["AI_FOURNISSEUR=anthropic", "restaure Sonnet natif en une variable"],
  ];

  const tableau = lignes
    .map(
      ([valeur, legende]) =>
        `<tr><td style="padding:0 12px 8px 0;font-family:${S.MONO};font-size:15px;color:${S.encre};white-space:nowrap;">${valeur}</td><td style="padding:0 0 8px;font-size:14px;color:${S.secondaire};">${legende}</td></tr>`,
    )
    .join("");

  const motifCourt = motif.length > 500 ? `${motif.slice(0, 500)}…` : motif;

  const corps = `<p style="margin:0 0 4px;font-family:${S.MONO};font-size:44px;line-height:1;color:${S.alerte};">${bascules}</p>
<p style="margin:0 0 24px;font-family:${S.MONO};font-size:13px;color:${S.alerte};">bascules Luna → Sonnet aujourd'hui</p>
<p style="margin:0 0 24px;font-size:15px;line-height:23px;color:${S.secondaire};">${constat}</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">${tableau}</table>
<p style="margin:0 0 4px;font-size:14px;color:${S.secondaire};">Motif de la dernière bascule :</p>
<p style="margin:0;font-family:${S.MONO};font-size:13px;line-height:19px;color:${S.encre};word-break:break-all;">${echapper(motifCourt)}</p>`;

  const text = [
    `${bascules} bascules Luna → Sonnet aujourd'hui (seuil ${seuil}).`,
    "",
    constat,
    "",
    heureUtc(instant),
    `AI_FOURNISSEUR=anthropic restaure Sonnet natif en une variable.`,
    "",
    `Motif de la dernière bascule : ${motifCourt}`,
  ].join("\n");

  return {
    subject: sujet(payload),
    html: envelopper({
      preentete: `${bascules} bascules aujourd'hui, ${heureUtc(instant)}.`,
      corps,
      raisonDeLEnvoi:
        "Alerte d'exploitation. Elle part une fois par jour au-delà du seuil, à l'adresse posée dans EMAIL_ALERTES.",
    }),
    text,
  };
}
