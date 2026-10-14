import type { Langue } from "@/lib/db/types";
import { textesDEmail } from "../traduction";
import { STYLE_DES_EMAILS as S, envelopper, type EmailRendu } from "./gabarit";

/**
 * Le rappel quotidien. Il énonce ce qui attend, il ne motive pas.
 *
 * Pas de version « rien à revoir aujourd'hui » : rien ne part quand rien n'est
 * dû. Un message quotidien qui annonce qu'il n'y a rien à faire s'apprend à ne
 * plus ouvrir, et abîme la remise des suivants.
 */

export type RappelQuotidienPayload = {
  /** Concepts dus aujourd'hui. Toujours au moins un : à zéro, rien ne part. */
  dus: number;
  currentStreak: number;
};

export function composerLeRappelQuotidien(
  payload: RappelQuotidienPayload,
  liens: { lienDeSession: string; lienDeDesinscription: string },
  langue: Langue,
): EmailRendu {
  const t = textesDEmail(langue);
  const { dus, currentStreak } = payload;
  const subject = t("rappel.sujet", { nombre: dus });
  const echeance = t("rappel.echeance", { nombre: dus });

  const serie =
    currentStreak > 0
      ? `<p style="margin:0 0 24px;font-family:${S.MONO};font-size:13px;color:${S.ember};">${currentStreak} ${t("commun.uniteDeSerie", { nombre: currentStreak })}</p>`
      : "";

  const corps = `<p style="margin:0 0 4px;font-family:${S.MONO};font-size:44px;line-height:1;color:${S.encre};">${dus}</p>
<p style="margin:0 0 24px;font-size:15px;line-height:23px;color:${S.secondaire};">${echeance}</p>
${serie}
<a href="${liens.lienDeSession}" style="display:inline-block;background:${S.accent};color:#FFFFFF;text-decoration:none;padding:12px 20px;font-size:15px;">${t("commun.commencer")}</a>`;

  const text = `${echeance}${
    currentStreak > 0 ? `\n${t("rappel.serieTexte", { nombre: currentStreak })}` : ""
  }\n\n${liens.lienDeSession}\n\n${t("rappel.nePlusRecevoir", { url: liens.lienDeDesinscription })}`;

  return {
    subject,
    html: envelopper({
      preentete: subject,
      corps,
      lienDeDesinscription: liens.lienDeDesinscription,
      langue,
    }),
    text,
  };
}
