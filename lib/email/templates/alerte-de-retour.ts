// i18n-ignore-fichier — outil de l'administrateur, qui reste en français.
import { EMAIL_STYLE as S, renderShell } from "./shell";
import type { RenderedEmail } from "./daily-reminder";

/**
 * Un retour vient d'arriver.
 *
 * Elle part à chaque retour, pas une fois par jour comme les autres alertes
 * d'exploitation : un plafond ou une bascule sont des états qui durent, un
 * retour est un événement. `RETOURS_PAR_JOUR` borne le pire cas.
 *
 * Elle porte le message presque entier ; la capture et l'auteur attendent dans
 * l'administration. L'adresse de l'auteur n'y figure pas : un email transite
 * par un tiers, autant qu'il porte le défaut et pas la personne.
 *
 * Aucun désabonnement, comme les autres alertes d'exploitation.
 */

export type AlerteDeRetourPayload = {
  /** Le sujet, déjà mis en mots — l'email n'a pas à connaître l'énumération. */
  sujet: string;
  /** L'écran nommé par la personne, si elle l'a fait. */
  ecran: string | null;
  message: string;
  /** Largeur de fenêtre et navigateur, tels que le retour les a enregistrés. */
  contexte: string | null;
  /** Une capture attend dans l'écran : le dire évite d'aller voir pour rien. */
  avecCapture: boolean;
  /** L'adresse de l'écran des retours, absolue. */
  lien: string;
};

/** Au-delà, on lit la suite dans l'écran : un email n'est pas une page. */
const MESSAGE_MAX = 1200;

function echapper(texte: string): string {
  return texte
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderAlerteDeRetour(payload: AlerteDeRetourPayload): RenderedEmail {
  const { sujet, ecran, message, contexte, avecCapture, lien } = payload;

  const court = message.length > MESSAGE_MAX ? `${message.slice(0, MESSAGE_MAX)}…` : message;

  const entete = ecran ? `${sujet} · ${ecran}` : sujet;

  const pied = [contexte, avecCapture ? "Capture jointe" : null]
    .filter((part): part is string => part !== null && part.length > 0)
    .join(" · ");

  const body = `<p style="margin:0 0 24px;font-family:${S.MONO};font-size:13px;letter-spacing:0.12em;text-transform:uppercase;color:${S.muted};">${echapper(entete)}</p>
<p style="margin:0 0 24px;font-size:17px;line-height:26px;color:${S.ink};white-space:pre-wrap;">${echapper(court)}</p>
${pied ? `<p style="margin:0 0 24px;font-family:${S.MONO};font-size:13px;color:${S.muted};">${echapper(pied)}</p>` : ""}
<a href="${lien}" style="display:inline-block;background:${S.accent};color:#FFFFFF;text-decoration:none;padding:12px 20px;font-size:15px;">Ouvrir les retours</a>`;

  const text = [entete, "", court, ...(pied ? ["", pied] : []), "", `Les retours : ${lien}`].join(
    "\n",
  );

  return {
    // Le sujet porte le début du message et non le nombre de retours : c'est ce
    // qui décide si on ouvre maintenant ou ce soir.
    subject: `Kairn — retour : ${court.slice(0, 60)}${court.length > 60 ? "…" : ""}`,
    html: renderShell({
      preheader: entete,
      body,
      raisonDeLEnvoi:
        "Alerte d'exploitation. Elle part à chaque retour, à l'adresse posée dans EMAIL_ALERTES.",
    }),
    text,
  };
}
