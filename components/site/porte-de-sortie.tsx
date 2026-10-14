"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

/**
 * De quoi recommencer, ou de quoi comprendre qu'on ne peut plus.
 *
 * Passé les deux essais par vingt-quatre heures, le lien est remplacé par une
 * phrase : une limite qu'on ne nomme pas se lit comme une panne. Elle ne
 * rappelle pas de créer un compte, l'appel est déjà sur la même ligne.
 *
 * Rien ne paraît tant que la chaîne tourne : `peutRedeposer` est faux pendant
 * l'extraction aussi, le dépôt en cours comptant déjà comme un essai.
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
