import { EMAIL_STYLE as S, renderShell } from "./shell";
import type { RenderedEmail } from "./daily-reminder";

/**
 * L'alerte de série, envoyée le soir et seulement quand il y a quelque chose à
 * perdre.
 *
 * Elle ne motive pas plus que le rappel : elle constate qu'une série existe, que
 * la journée n'a rien enregistré, et qu'il reste du temps. C'est la seule
 * occurrence de l'ember dans les emails, comme c'est la seule dans l'interface —
 * cet accent n'appartient qu'à la série.
 *
 * Ce qu'elle ne dit pas : « ne casse pas ta série », « plus que quelques
 * heures », ni rien qui presse. Le fait suffit ; qui tient une série de douze
 * sessions sait déjà ce qu'il en coûte de sauter un soir.
 */

export type AlerteDeStreakPayload = {
  /** Sessions d'affilée en cours. Toujours au moins une, sinon rien n'est en jeu. */
  currentStreak: number;
  /** Concepts dus aujourd'hui. Toujours au moins un, sinon rien n'est jouable. */
  dueCount: number;
};

function concepts(count: number): string {
  return count === 1 ? "1 concept" : `${count} concepts`;
}

export function renderAlerteDeStreak(
  { currentStreak, dueCount }: AlerteDeStreakPayload,
  links: { sessionUrl: string; unsubscribeUrl: string },
): RenderedEmail {
  const subject = "Ta série se joue aujourd'hui";
  const unite = currentStreak === 1 ? "session" : "sessions d'affilée";

  const body = `<p style="margin:0 0 4px;font-family:${S.MONO};font-size:44px;line-height:1;color:${S.ember};">${currentStreak}</p>
<p style="margin:0 0 24px;font-family:${S.MONO};font-size:13px;color:${S.ember};">${unite}</p>
<p style="margin:0 0 24px;font-size:15px;line-height:23px;color:${S.muted};">Rien n'a été revu aujourd'hui, et ${concepts(dueCount)} attendent. Une seule question suffit à tenir la série.</p>
<a href="${links.sessionUrl}" style="display:inline-block;background:${S.glacier};color:#FFFFFF;text-decoration:none;padding:12px 20px;font-size:15px;">Commencer</a>`;

  const text = `${currentStreak} ${unite}.\n\nRien n'a été revu aujourd'hui, et ${concepts(dueCount)} attendent. Une seule question suffit à tenir la série.\n\n${links.sessionUrl}\n\nNe plus recevoir cette alerte : ${links.unsubscribeUrl}`;

  return {
    subject,
    html: renderShell({
      preheader: `${currentStreak} ${unite}, et rien aujourd'hui.`,
      body,
      unsubscribeUrl: links.unsubscribeUrl,
      raisonDeLEnvoi:
        "Tu reçois ce message parce que l'alerte de série est activée sur ton compte.",
    }),
    text,
  };
}
