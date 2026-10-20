import type { Langue } from "@/lib/db/types";
import { textesDEmail } from "../traduction";
import { STYLE_DES_EMAILS as S, bouton, envelopper, type EmailRendu } from "./gabarit";

/**
 * Constate sans reprocher : souvent on n'a pas vu quoi déposer, d'où des
 * exemples ordinaires. Ni compteur ni série : à zéro, ils diraient « en retard ».
 */

export type RelanceDuCompteVidePayload = Record<string, never>;

export function composerLaRelanceDuCompteVide(
  _payload: RelanceDuCompteVidePayload,
  liens: { lienDeDepot: string; lienDeDesinscription: string },
  langue: Langue,
): EmailRendu {
  const t = textesDEmail(langue);
  const subject = t("relance.sujet");

  const corps = `<p style="margin:0 0 16px;font-size:17px;line-height:25px;font-weight:600;letter-spacing:-0.01em;color:${S.encre};">${t("relance.titre")}</p>
<p style="margin:0 0 12px;font-size:15px;line-height:23px;color:${S.secondaire};">${t("relance.exemples")}</p>
<p style="margin:0 0 24px;font-size:15px;line-height:23px;color:${S.secondaire};">${t("relance.retour")}</p>
${bouton(liens.lienDeDepot, t("commun.deposer"))}`;

  const text = [
    t("relance.titre"),
    t("relance.exemples"),
    t("relance.retour"),
    liens.lienDeDepot,
    t("commun.nePlusRecevoirEmails", { url: liens.lienDeDesinscription }),
  ].join("\n\n");

  return {
    subject,
    html: envelopper({
      preentete: t("relance.preheader"),
      corps,
      lienDeDesinscription: liens.lienDeDesinscription,
      raisonDeLEnvoi: t("relance.raison"),
      langue,
    }),
    text,
  };
}
