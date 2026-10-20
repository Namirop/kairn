import type { Langue } from "@/lib/db/types";
import { textesDEmail } from "../traduction";
import { STYLE_DES_EMAILS as S, bouton, envelopper, type EmailRendu } from "./gabarit";

/**
 * Énonce ce qui attend, ne motive pas. Pas de version « rien à revoir » : elle
 * apprendrait à ne plus ouvrir et abîmerait la remise des suivants.
 */

export type RappelQuotidienPayload = {
  /** Au moins un : à zéro, rien ne part. */
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
${bouton(liens.lienDeSession, t("commun.commencer"))}`;

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
