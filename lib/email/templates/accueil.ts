import type { Langue } from "@/lib/db/types";
import { textesDEmail } from "../traduction";
import { EMAIL_STYLE as S, renderShell } from "./shell";
import type { RenderedEmail } from "./daily-reminder";

/**
 * L'accueil, une fois, à l'inscription : il dit quoi faire maintenant, et rien
 * d'autre.
 *
 * Deux corps : un compte peut naître déjà plein, quand la reprise de visite
 * rattache un essai. Le corps se choisit sur ce que le compte porte, pas sur le
 * fait qu'il soit neuf.
 */

export type AccueilPayload = {
  /**
   * Concepts déjà au compte à l'envoi. Au-dessus de zéro, c'est un essai
   * repris, et l'email pointe la session plutôt que le dépôt.
   */
  conceptCount: number;
};

type Textes = ReturnType<typeof textesDEmail>;

/** Le bouton porte le mot de l'interface, et le même dans tout le flux. */
function bouton(href: string, libelle: string): string {
  return `<a href="${href}" style="display:inline-block;background:${S.accent};color:#FFFFFF;text-decoration:none;padding:12px 20px;font-size:15px;">${libelle}</a>`;
}

function corpsAvecConcepts(t: Textes, count: number, sessionUrl: string): string {
  return `<p style="margin:0 0 4px;font-family:${S.MONO};font-size:44px;line-height:1;color:${S.ink};">${count}</p>
<p style="margin:0 0 24px;font-size:15px;line-height:23px;color:${S.muted};">${t("accueil.arrives", { nombre: count })}</p>
${bouton(sessionUrl, t("commun.commencer"))}`;
}

function corpsSansConcept(t: Textes, depotUrl: string): string {
  return `<p style="margin:0 0 16px;font-size:17px;line-height:25px;font-weight:600;letter-spacing:-0.01em;color:${S.ink};">${t("accueil.ouvert")}</p>
<p style="margin:0 0 12px;font-size:15px;line-height:23px;color:${S.muted};">${t("accueil.premierePierre")}</p>
<p style="margin:0 0 24px;font-size:15px;line-height:23px;color:${S.muted};">${t("accueil.decoupe")}</p>
${bouton(depotUrl, t("commun.deposer"))}`;
}

function texte(t: Textes, count: number, links: { sessionUrl: string; depotUrl: string }): string {
  if (count > 0) return `${t("accueil.arrives", { nombre: count })}\n\n${links.sessionUrl}`;

  const paragraphes = [t("accueil.ouvert"), t("accueil.premierePierre"), t("accueil.decoupe")];

  return [...paragraphes, links.depotUrl].join("\n\n");
}

export function renderAccueil(
  payload: AccueilPayload,
  links: { sessionUrl: string; depotUrl: string; unsubscribeUrl: string },
  langue: Langue,
): RenderedEmail {
  const t = textesDEmail(langue);
  const { conceptCount } = payload;
  const plein = conceptCount > 0;

  const subject = plein
    ? t("accueil.sujetPlein", { nombre: conceptCount })
    : t("accueil.sujetVide");

  const body = plein
    ? corpsAvecConcepts(t, conceptCount, links.sessionUrl)
    : corpsSansConcept(t, links.depotUrl);

  return {
    subject,
    html: renderShell({
      preheader: subject,
      body,
      unsubscribeUrl: links.unsubscribeUrl,
      raisonDeLEnvoi: t("accueil.raison"),
      langue,
    }),
    text: `${texte(t, conceptCount, links)}\n\n${t("commun.nePlusRecevoirEmails", { url: links.unsubscribeUrl })}`,
  };
}
