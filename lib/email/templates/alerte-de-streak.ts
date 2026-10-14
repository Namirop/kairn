import type { Langue } from "@/lib/db/types";
import { textesDEmail } from "../traduction";
import { STYLE_DES_EMAILS as S, bouton, envelopper, type EmailRendu } from "./gabarit";

/**
 * L'alerte de série, envoyée le soir et seulement quand il y a quelque chose à
 * perdre. Elle constate, elle ne presse pas. Seule occurrence de l'ember dans
 * les emails : cet accent n'appartient qu'à la série.
 */

export type AlerteDeStreakPayload = {
  /** Sessions d'affilée en cours. Toujours au moins une, sinon rien n'est en jeu. */
  currentStreak: number;
  /** Concepts dus aujourd'hui. Toujours au moins un, sinon rien n'est jouable. */
  dus: number;
};

export function composerLAlerteDeStreak(
  { currentStreak, dus }: AlerteDeStreakPayload,
  liens: { lienDeSession: string; lienDeDesinscription: string },
  langue: Langue,
): EmailRendu {
  const t = textesDEmail(langue);
  const subject = t("serie.sujet");
  const unite = t("commun.uniteDeSerie", { nombre: currentStreak });
  const constat = t("serie.constat", { nombre: dus });

  const corps = `<p style="margin:0 0 4px;font-family:${S.MONO};font-size:44px;line-height:1;color:${S.ember};">${currentStreak}</p>
<p style="margin:0 0 24px;font-family:${S.MONO};font-size:13px;color:${S.ember};">${unite}</p>
<p style="margin:0 0 24px;font-size:15px;line-height:23px;color:${S.secondaire};">${constat}</p>
${bouton(liens.lienDeSession, t("commun.commencer"))}`;

  const nePlusRecevoir = t("serie.nePlusRecevoir", { url: liens.lienDeDesinscription });
  const text = `${currentStreak} ${unite}.\n\n${constat}\n\n${liens.lienDeSession}\n\n${nePlusRecevoir}`;

  return {
    subject,
    html: envelopper({
      preentete: t("serie.preheader", { serie: `${currentStreak} ${unite}` }),
      corps,
      lienDeDesinscription: liens.lienDeDesinscription,
      raisonDeLEnvoi: t("serie.raison"),
      langue,
    }),
    text,
  };
}
