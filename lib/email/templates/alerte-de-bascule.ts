// i18n-ignore-fichier — outil de l'administrateur, qui reste en français.
import { STYLE_DES_EMAILS as S, envelopper, type EmailRendu } from "./gabarit";
import { heureUtc, lignesDeValeurs } from "./blocs-d-alerte";
import { echapper } from "./echapper";

/**
 * Quand les bascules Luna → Sonnet s'accumulent : le repli tient les dépôts,
 * mais c'est le fournisseur qu'il faut regarder. Donne la variable qui change
 * de lignée sans commit.
 */

export type AlerteDeBasculePayload = {
  /** Seuil compris. */
  bascules: number;
  /** `SEUIL_BASCULES`. */
  seuil: number;
  /** De la dernière bascule, coupé à 500 caractères : un indice, pas la trace. */
  motif: string;
  instant: Date;
};

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

  const tableau = lignesDeValeurs(lignes);

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
