// i18n-ignore-fichier — outil de l'administrateur, qui reste en français.
import { STYLE_DES_EMAILS as S, bouton, envelopper, type EmailRendu } from "./gabarit";
import { echapper } from "./echapper";

/**
 * À chaque retour, pas une fois par jour : un retour est un événement, pas un
 * état qui dure. `RETOURS_PAR_JOUR` borne le pire cas. Sans l'adresse de
 * l'auteur : l'email transite par un tiers, il porte le défaut, pas la personne.
 */

export type AlerteDeRetourPayload = {
  /** Déjà mis en mots : l'email n'a pas à connaître l'énumération. */
  sujet: string;
  ecran: string | null;
  message: string;
  contexte: string | null;
  avecCapture: boolean;
  /** Absolue. */
  lien: string;
};

/** Au-delà, la suite se lit dans l'écran. */
const MESSAGE_MAX = 1200;

export function composerLAlerteDeRetour(payload: AlerteDeRetourPayload): EmailRendu {
  const { sujet, ecran, message, contexte, avecCapture, lien } = payload;

  const court = message.length > MESSAGE_MAX ? `${message.slice(0, MESSAGE_MAX)}…` : message;

  const entete = ecran ? `${sujet} · ${ecran}` : sujet;

  const pied = [contexte, avecCapture ? "Capture jointe" : null]
    .filter((part): part is string => part !== null && part.length > 0)
    .join(" · ");

  const corps = `<p style="margin:0 0 24px;font-family:${S.MONO};font-size:13px;letter-spacing:0.12em;text-transform:uppercase;color:${S.secondaire};">${echapper(entete)}</p>
<p style="margin:0 0 24px;font-size:17px;line-height:26px;color:${S.encre};white-space:pre-wrap;">${echapper(court)}</p>
${pied ? `<p style="margin:0 0 24px;font-family:${S.MONO};font-size:13px;color:${S.secondaire};">${echapper(pied)}</p>` : ""}
${bouton(lien, "Ouvrir les retours")}`;

  const text = [entete, "", court, ...(pied ? ["", pied] : []), "", `Les retours : ${lien}`].join(
    "\n",
  );

  return {
    // Le début du message : c'est ce qui décide d'ouvrir maintenant ou ce soir.
    subject: `Kairn — retour : ${court.slice(0, 60)}${court.length > 60 ? "…" : ""}`,
    html: envelopper({
      preentete: entete,
      corps,
      raisonDeLEnvoi:
        "Alerte d'exploitation. Elle part à chaque retour, à l'adresse posée dans EMAIL_ALERTES.",
    }),
    text,
  };
}
