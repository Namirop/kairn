import type { Langue } from "@/lib/db/types";
import { textesDEmail } from "../traduction";
import { EMAIL_STYLE as S, renderShell } from "./shell";

/**
 * Le rappel quotidien. Il énonce ce qui attend, il ne motive pas.
 *
 * Pas de version « rien à revoir aujourd'hui » : rien ne part quand rien n'est
 * dû. Un message quotidien qui annonce qu'il n'y a rien à faire s'apprend à ne
 * plus ouvrir, et abîme la remise des suivants.
 */

export type DailyReminderPayload = {
  /** Concepts dus aujourd'hui. Toujours au moins un : à zéro, rien ne part. */
  dueCount: number;
  currentStreak: number;
};

export type RenderedEmail = {
  subject: string;
  html: string;
  text: string;
};

export function renderDailyReminder(
  payload: DailyReminderPayload,
  links: { sessionUrl: string; unsubscribeUrl: string },
  langue: Langue,
): RenderedEmail {
  const t = textesDEmail(langue);
  const { dueCount, currentStreak } = payload;
  const subject = t("rappel.sujet", { nombre: dueCount });
  const echeance = t("rappel.echeance", { nombre: dueCount });

  const streak =
    currentStreak > 0
      ? `<p style="margin:0 0 24px;font-family:${S.MONO};font-size:13px;color:${S.ember};">${currentStreak} ${t("commun.uniteDeSerie", { nombre: currentStreak })}</p>`
      : "";

  const body = `<p style="margin:0 0 4px;font-family:${S.MONO};font-size:44px;line-height:1;color:${S.ink};">${dueCount}</p>
<p style="margin:0 0 24px;font-size:15px;line-height:23px;color:${S.muted};">${echeance}</p>
${streak}
<a href="${links.sessionUrl}" style="display:inline-block;background:${S.accent};color:#FFFFFF;text-decoration:none;padding:12px 20px;font-size:15px;">${t("commun.commencer")}</a>`;

  const text = `${echeance}${
    currentStreak > 0 ? `\n${t("rappel.serieTexte", { nombre: currentStreak })}` : ""
  }\n\n${links.sessionUrl}\n\n${t("rappel.nePlusRecevoir", { url: links.unsubscribeUrl })}`;

  return {
    subject,
    html: renderShell({ preheader: subject, body, unsubscribeUrl: links.unsubscribeUrl, langue }),
    text,
  };
}
