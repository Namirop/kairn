import { EMAIL_STYLE as S, renderShell } from "./shell";
import type { RenderedEmail } from "./daily-reminder";

/**
 * L'accueil, une fois, à l'inscription.
 *
 * Il dit quoi faire maintenant, et rien d'autre. Pas de visite guidée des
 * fonctions, pas de bienvenue qui s'étale : quelqu'un qui vient de créer un
 * compte a une intention en tête, et le seul service à lui rendre est de la
 * laisser aboutir en un clic.
 *
 * **Deux corps, et c'est le point délicat.** Un compte peut naître déjà plein :
 * la reprise de visite rattache ce qu'un visiteur avait déposé avant de
 * s'inscrire. Lui dire « dépose ta première chose » serait faux, et ferait
 * douter de ce qu'il vient justement de voir arriver. Le corps se choisit donc
 * sur ce que le compte porte réellement, pas sur le fait qu'il soit neuf.
 */

export type AccueilPayload = {
  /**
   * Concepts déjà au compte à l'instant de l'envoi.
   *
   * Zéro est le cas courant — on s'inscrit avant de déposer. Au-dessus de zéro,
   * c'est un essai repris, et l'email pointe la session plutôt que le dépôt.
   */
  conceptCount: number;
};

function concepts(count: number): string {
  return count === 1 ? "1 concept" : `${count} concepts`;
}

/** Le bouton porte le mot de l'interface, et le même dans tout le flux. */
function bouton(href: string, libelle: string): string {
  return `<a href="${href}" style="display:inline-block;background:${S.lichen};color:#FFFFFF;text-decoration:none;padding:12px 20px;font-size:15px;">${libelle}</a>`;
}

function corpsAvecConcepts(count: number, sessionUrl: string): string {
  return `<p style="margin:0 0 4px;font-family:${S.MONO};font-size:44px;line-height:1;color:${S.ink};">${count}</p>
<p style="margin:0 0 24px;font-size:15px;line-height:23px;color:${S.muted};">${concepts(count)} sont arrivés avec toi. Leurs questions s'écrivent, et la première session t'attend.</p>
${bouton(sessionUrl, "Commencer")}`;
}

function corpsSansConcept(depotUrl: string): string {
  return `<p style="margin:0 0 16px;font-size:17px;line-height:25px;font-weight:600;letter-spacing:-0.01em;color:${S.ink};">Ton compte est ouvert.</p>
<p style="margin:0 0 12px;font-size:15px;line-height:23px;color:${S.muted};">Il attend sa première pierre. Dépose une information que tu veux garder — une phrase entendue, un paragraphe copié, une capture d'écran. Elle n'a pas à être propre ni longue.</p>
<p style="margin:0 0 24px;font-size:15px;line-height:23px;color:${S.muted};">Kairn la découpe en concepts, en fait des questions, et te les repose quand tu es sur le point de les oublier.</p>
${bouton(depotUrl, "Déposer")}`;
}

export function renderAccueil(
  payload: AccueilPayload,
  links: { sessionUrl: string; depotUrl: string; unsubscribeUrl: string },
): RenderedEmail {
  const { conceptCount } = payload;
  const plein = conceptCount > 0;

  const subject = plein ? `${concepts(conceptCount)} t'attendent` : "Ton compte Kairn est ouvert";

  const body = plein
    ? corpsAvecConcepts(conceptCount, links.sessionUrl)
    : corpsSansConcept(links.depotUrl);

  const text = plein
    ? `${concepts(conceptCount)} sont arrivés avec toi. Leurs questions s'écrivent, et la première session t'attend.\n\n${links.sessionUrl}`
    : `Ton compte est ouvert.\n\nIl attend sa première pierre. Dépose une information que tu veux garder — une phrase entendue, un paragraphe copié, une capture d'écran. Elle n'a pas à être propre ni longue.\n\nKairn la découpe en concepts, en fait des questions, et te les repose quand tu es sur le point de les oublier.\n\n${links.depotUrl}`;

  return {
    subject,
    html: renderShell({
      preheader: subject,
      body,
      unsubscribeUrl: links.unsubscribeUrl,
      raisonDeLEnvoi: "Tu reçois ce message parce que tu viens de créer un compte sur Kairn.",
    }),
    text: `${text}\n\nNe plus recevoir d'emails de Kairn : ${links.unsubscribeUrl}`,
  };
}
