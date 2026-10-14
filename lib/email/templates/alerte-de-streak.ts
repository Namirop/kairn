import type { Langue } from "@/lib/db/types";
import { textesDEmail } from "../traduction";
import { EMAIL_STYLE as S, renderShell } from "./shell";
import type { RenderedEmail } from "./daily-reminder";

/**
 * L'alerte de série, envoyée le soir et seulement quand il y a quelque chose à
 * perdre. Elle constate, elle ne presse pas. Seule occurrence de l'ember dans
 * les emails : cet accent n'appartient qu'à la série.
 */

export type AlerteDeStreakPayload = {
  /** Sessions d'affilée en cours. Toujours au moins une, sinon rien n'est en jeu. */
  currentStreak: number;
  /** Concepts dus aujourd'hui. Toujours au moins un, sinon rien n'est jouable. */
  dueCount: number;
};

export function renderAlerteDeStreak(
  { currentStreak, dueCount }: AlerteDeStreakPayload,
  links: { sessionUrl: string; unsubscribeUrl: string },
  langue: Langue,
): RenderedEmail {
  const t = textesDEmail(langue);
  const subject = t("serie.sujet");
  const unite = t("commun.uniteDeSerie", { nombre: currentStreak });
  const constat = t("serie.constat", { nombre: dueCount });

  const body = `<p style="margin:0 0 4px;font-family:${S.MONO};font-size:44px;line-height:1;color:${S.ember};">${currentStreak}</p>
<p style="margin:0 0 24px;font-family:${S.MONO};font-size:13px;color:${S.ember};">${unite}</p>
<p style="margin:0 0 24px;font-size:15px;line-height:23px;color:${S.muted};">${constat}</p>
<a href="${links.sessionUrl}" style="display:inline-block;background:${S.accent};color:#FFFFFF;text-decoration:none;padding:12px 20px;font-size:15px;">${t("commun.commencer")}</a>`;

  const nePlusRecevoir = t("serie.nePlusRecevoir", { url: links.unsubscribeUrl });
  const text = `${currentStreak} ${unite}.\n\n${constat}\n\n${links.sessionUrl}\n\n${nePlusRecevoir}`;

  return {
    subject,
    html: renderShell({
      preheader: t("serie.preheader", { serie: `${currentStreak} ${unite}` }),
      body,
      unsubscribeUrl: links.unsubscribeUrl,
      raisonDeLEnvoi: t("serie.raison"),
      langue,
    }),
    text,
  };
}
