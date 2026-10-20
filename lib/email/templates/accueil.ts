import type { Langue } from "@/lib/db/types";
import { textesDEmail } from "../traduction";
import { STYLE_DES_EMAILS as S, bouton, envelopper, type EmailRendu } from "./gabarit";

/**
 * Dit quoi faire maintenant, rien d'autre. Deux corps : un compte peut naître
 * plein quand un essai est repris ; on choisit sur ce qu'il porte, pas sur sa nouveauté.
 */

export type AccueilPayload = {
  /** Au-dessus de zéro, un essai repris : l'email pointe la session plutôt que le dépôt. */
  nombreDeConcepts: number;
};

type Textes = ReturnType<typeof textesDEmail>;

function corpsAvecConcepts(t: Textes, nombre: number, lienDeSession: string): string {
  return `<p style="margin:0 0 4px;font-family:${S.MONO};font-size:44px;line-height:1;color:${S.encre};">${nombre}</p>
<p style="margin:0 0 24px;font-size:15px;line-height:23px;color:${S.secondaire};">${t("accueil.arrives", { nombre })}</p>
${bouton(lienDeSession, t("commun.commencer"))}`;
}

function corpsSansConcept(t: Textes, lienDeDepot: string): string {
  return `<p style="margin:0 0 16px;font-size:17px;line-height:25px;font-weight:600;letter-spacing:-0.01em;color:${S.encre};">${t("accueil.ouvert")}</p>
<p style="margin:0 0 12px;font-size:15px;line-height:23px;color:${S.secondaire};">${t("accueil.premierePierre")}</p>
<p style="margin:0 0 24px;font-size:15px;line-height:23px;color:${S.secondaire};">${t("accueil.decoupe")}</p>
${bouton(lienDeDepot, t("commun.deposer"))}`;
}

function texte(
  t: Textes,
  nombre: number,
  liens: { lienDeSession: string; lienDeDepot: string },
): string {
  if (nombre > 0) return `${t("accueil.arrives", { nombre })}\n\n${liens.lienDeSession}`;

  const paragraphes = [t("accueil.ouvert"), t("accueil.premierePierre"), t("accueil.decoupe")];

  return [...paragraphes, liens.lienDeDepot].join("\n\n");
}

export function composerLAccueil(
  payload: AccueilPayload,
  liens: { lienDeSession: string; lienDeDepot: string; lienDeDesinscription: string },
  langue: Langue,
): EmailRendu {
  const t = textesDEmail(langue);
  const { nombreDeConcepts } = payload;
  const plein = nombreDeConcepts > 0;

  const subject = plein
    ? t("accueil.sujetPlein", { nombre: nombreDeConcepts })
    : t("accueil.sujetVide");

  const corps = plein
    ? corpsAvecConcepts(t, nombreDeConcepts, liens.lienDeSession)
    : corpsSansConcept(t, liens.lienDeDepot);

  return {
    subject,
    html: envelopper({
      preentete: subject,
      corps,
      lienDeDesinscription: liens.lienDeDesinscription,
      raisonDeLEnvoi: t("accueil.raison"),
      langue,
    }),
    text: `${texte(t, nombreDeConcepts, liens)}\n\n${t("commun.nePlusRecevoirEmails", { url: liens.lienDeDesinscription })}`,
  };
}
