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
): RenderedEmail {
  const subject = "Ton compte Kairn est encore vide";

  const body = `<p style="margin:0 0 16px;font-size:17px;line-height:25px;font-weight:600;letter-spacing:-0.01em;color:${S.ink};">Rien n'est encore déposé.</p>
<p style="margin:0 0 12px;font-size:15px;line-height:23px;color:${S.muted};">Kairn marche avec ce qui te passe sous les yeux : une recommandation qu'on t'a faite, un raccourci que tu réapprends tous les mois, trois lignes d'un article. Une seule chose suffit à commencer.</p>
<p style="margin:0 0 24px;font-size:15px;line-height:23px;color:${S.muted};">Elle devient quelques concepts, et ils te reviennent espacés dans le temps, juste avant le moment où tu les aurais oubliés.</p>
<a href="${links.depotUrl}" style="display:inline-block;background:${S.accent};color:#FFFFFF;text-decoration:none;padding:12px 20px;font-size:15px;">Déposer</a>`;

  const text = `Rien n'est encore déposé.

Kairn marche avec ce qui te passe sous les yeux : une recommandation qu'on t'a faite, un raccourci que tu réapprends tous les mois, trois lignes d'un article. Une seule chose suffit à commencer.

Elle devient quelques concepts, et ils te reviennent espacés dans le temps, juste avant le moment où tu les aurais oubliés.

${links.depotUrl}

Ne plus recevoir d'emails de Kairn : ${links.unsubscribeUrl}`;

  return {
    subject,
    html: renderShell({
      preheader: "Une seule chose suffit à commencer.",
      body,
      unsubscribeUrl: links.unsubscribeUrl,
      raisonDeLEnvoi:
        "Tu reçois ce message une fois, parce que ton compte Kairn est resté vide depuis son ouverture.",
    }),
    text,
  };
}
