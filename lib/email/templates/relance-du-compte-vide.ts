import type { Langue } from "@/lib/db/types";
import { textesDEmail } from "../traduction";
import { EMAIL_STYLE as S, renderShell } from "./shell";
import type { RenderedEmail } from "./daily-reminder";

/**
 * La relance d'un compte resté vide, une fois, quelques jours après l'inscription.
 *
 * Elle constate sans reprocher : le plus souvent, on n'a pas vu quoi déposer,
 * et l'email donne des exemples assez ordinaires pour en avoir un sous la main.
 *
 * Pas de compteur ni de série : à zéro, ils diraient au compte qu'il est en
 * retard.
 */

export type RelanceDuCompteVidePayload = Record<string, never>;

export function renderRelanceDuCompteVide(
  _payload: RelanceDuCompteVidePayload,
  links: { depotUrl: string; unsubscribeUrl: string },
  langue: Langue,
): RenderedEmail {
  const t = textesDEmail(langue);
  const subject = t("relance.sujet");

  const body = `<p style="margin:0 0 16px;font-size:17px;line-height:25px;font-weight:600;letter-spacing:-0.01em;color:${S.ink};">${t("relance.titre")}</p>
<p style="margin:0 0 12px;font-size:15px;line-height:23px;color:${S.muted};">${t("relance.exemples")}</p>
<p style="margin:0 0 24px;font-size:15px;line-height:23px;color:${S.muted};">${t("relance.retour")}</p>
<a href="${links.depotUrl}" style="display:inline-block;background:${S.accent};color:#FFFFFF;text-decoration:none;padding:12px 20px;font-size:15px;">${t("commun.deposer")}</a>`;

  const text = [
    t("relance.titre"),
    t("relance.exemples"),
    t("relance.retour"),
    links.depotUrl,
    t("commun.nePlusRecevoirEmails", { url: links.unsubscribeUrl }),
  ].join("\n\n");

  return {
    subject,
    html: renderShell({
      preheader: t("relance.preheader"),
      body,
      unsubscribeUrl: links.unsubscribeUrl,
      raisonDeLEnvoi: t("relance.raison"),
      langue,
    }),
    text,
  };
}
