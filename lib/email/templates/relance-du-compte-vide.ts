import type { Langue } from "@/lib/db/types";
import { textesDEmail } from "../traduction";
import { EMAIL_STYLE as S, renderShell } from "./shell";
import type { RenderedEmail } from "./daily-reminder";

/**
 * La relance d'un compte resté vide, une fois, quelques jours après l'inscription.
 *
 * **Elle constate, elle ne reproche pas.** Quelqu'un qui s'est inscrit sans rien
 * déposer n'a rien fait de mal : le plus souvent il n'a pas vu quoi mettre dans
 * l'écran de dépôt. L'email répond à ça et à rien d'autre — il donne des
 * exemples assez ordinaires pour qu'on en ait un sous la main en lisant.
 *
 * Pas de compteur, pas de série, pas de progression : ce compte n'en a aucune,
 * et lui en montrer une à zéro serait lui dire qu'il est en retard.
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
