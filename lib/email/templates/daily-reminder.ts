import { EMAIL_STYLE as S, renderShell } from "./shell";

/**
 * Le rappel quotidien. Il énonce ce qui attend, il ne motive pas : la
 * récompense est la progression affichée, pas un encouragement dans un email.
 */

export type DailyReminderPayload = {
  dueCount: number;
  currentStreak: number;
};

export type RenderedEmail = {
  subject: string;
  html: string;
  text: string;
};

function concepts(count: number): string {
  return count === 1 ? "1 concept" : `${count} concepts`;
}

export function renderDailyReminder(
  payload: DailyReminderPayload,
  links: { sessionUrl: string; unsubscribeUrl: string },
): RenderedEmail {
  const { dueCount, currentStreak } = payload;
  const subject =
    dueCount === 0 ? "Rien à revoir aujourd'hui" : `${concepts(dueCount)} à revoir aujourd'hui`;

  const streak =
    currentStreak > 0
      ? `<p style="margin:0 0 24px;font-family:${S.MONO};font-size:13px;color:${S.ember};">${currentStreak} jours d'affilée</p>`
      : "";

  const body =
    dueCount === 0
      ? `<p style="margin:0 0 8px;font-size:20px;line-height:28px;">Rien n'arrive à échéance aujourd'hui.</p>
<p style="margin:0 0 24px;font-size:15px;line-height:23px;color:${S.muted};">C'est le bon moment pour déposer quelque chose de nouveau.</p>
${streak}
<a href="${links.sessionUrl}" style="display:inline-block;background:${S.ink};color:${S.paper};text-decoration:none;padding:12px 20px;font-size:15px;">Déposer</a>`
      : `<p style="margin:0 0 4px;font-family:${S.MONO};font-size:44px;line-height:1;color:${S.ink};">${dueCount}</p>
<p style="margin:0 0 24px;font-size:15px;line-height:23px;color:${S.muted};">${concepts(dueCount)} arrivent à échéance aujourd'hui.</p>
${streak}
<a href="${links.sessionUrl}" style="display:inline-block;background:${S.lichen};color:#FFFFFF;text-decoration:none;padding:12px 20px;font-size:15px;">Commencer</a>`;

  const text =
    dueCount === 0
      ? `Rien n'arrive à échéance aujourd'hui. C'est le bon moment pour déposer quelque chose de nouveau.\n\n${links.sessionUrl}\n\nNe plus recevoir ce rappel : ${links.unsubscribeUrl}`
      : `${concepts(dueCount)} arrivent à échéance aujourd'hui.${currentStreak > 0 ? `\n${currentStreak} jours d'affilée.` : ""}\n\n${links.sessionUrl}\n\nNe plus recevoir ce rappel : ${links.unsubscribeUrl}`;

  return {
    subject,
    html: renderShell({ preheader: subject, body, unsubscribeUrl: links.unsubscribeUrl }),
    text,
  };
}
