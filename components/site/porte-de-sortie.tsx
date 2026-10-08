"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

/**
 * De quoi recommencer, ou de quoi comprendre qu'on ne peut plus.
 *
 * **Le lien disparaissait sans un mot.** La base accorde deux essais par tranche
 * de vingt-quatre heures ; passé le second, « Déposer autre chose » s'en allait,
 * et rien ne disait qu'il avait existé ni pourquoi il n'était plus là. Quelqu'un
 * qui vient d'en faire un second cherche le lien qu'il a utilisé cinq minutes
 * plus tôt, et se demande ce qu'il a cassé. Une limite qu'on ne nomme pas se lit
 * comme une panne.
 *
 * **La phrase ne rappelle pas de créer un compte, et c'est délibéré.** Aux deux
 * endroits où elle paraît, l'appel est déjà sur la même ligne — « Les garder »
 * dans la bande, « Les garder » et sa mention dans le pied de la fenêtre. Le
 * redire ferait trois fois la même invitation sur une largeur de téléphone, et
 * c'est la limite, pas l'invitation, qui manquait.
 *
 * **Rien ne paraît tant que la chaîne tourne.** `peutRedeposer` est faux pendant
 * l'extraction aussi — le dépôt en cours compte déjà comme un essai pris —, et
 * annoncer là que les essais sont faits serait faux d'une seconde : ils le
 * deviennent au bout. Tant que ça tourne, la place reste vide.
 */
export function PorteDeSortie({
  peutRedeposer,
  chaineFinie,
  surRedepot,
  clair = false,
}: {
  peutRedeposer: boolean;
  /** L'extraction est allée au bout, quel qu'ait été son verdict. */
  chaineFinie: boolean;
  surRedepot: () => void;
  /** Sur la roche, le lien et la phrase s'inversent en gris clairs. */
  clair?: boolean;
}) {
  const t = useTranslations("site.essai.sortie");

  if (peutRedeposer) {
    return (
      <Button
        type="button"
        variant={clair ? "linkClair" : "link"}
        size="sm"
        className="px-0"
        onClick={surRedepot}
      >
        {t("redeposer")}
      </Button>
    );
  }

  if (!chaineFinie) return null;

  return (
    <span className={`text-petit ${clair ? "text-stone-300" : "text-stone-500"}`}>
      {t("essaisFaits")}
    </span>
  );
}
