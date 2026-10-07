import { EMAIL_STYLE as S, renderShell } from "./shell";
import type { RenderedEmail } from "./daily-reminder";

/**
 * Un retour vient d'arriver.
 *
 * Elle part **à chaque retour**, et pas une fois par jour comme les deux autres
 * alertes d'exploitation. La différence tient à ce qu'elle annonce : une bascule
 * ou un plafond sont des états qui durent, dont on lit le compte du jour ; un
 * retour est un événement unique, écrit par quelqu'un qui a pris la peine de
 * s'arrêter, et le résumer avec quatorze autres le lendemain lui ferait perdre
 * précisément ce qui le rend utile. Le plafond de vingt par compte et par jour
 * borne le pire cas.
 *
 * Elle porte le message en entier, ou presque : ouvrir l'écran pour lire deux
 * phrases est le genre de friction qui fait qu'on ne les lit pas. Le reste — la
 * capture, l'auteur — attend dans l'administration, et le bouton y mène.
 *
 * **L'adresse de qui a écrit n'y figure pas.** Elle ne change rien à ce qu'il y
 * a à corriger, et un email transite par un tiers : autant qu'il porte le
 * défaut, pas la personne. Elle est dans l'écran, pour qui en a besoin.
 *
 * Aucun désabonnement, même règle que les autres alertes d'exploitation.
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
