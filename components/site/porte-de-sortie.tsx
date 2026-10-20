"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

/**
 * De quoi recommencer, ou comprendre qu'on ne peut plus : passé deux essais
 * par 24 h, une phrase nomme la limite, sans quoi elle se lirait comme une
 * panne. Rien tant que la chaîne tourne : le dépôt en cours compte déjà.
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
  /** Sur la roche. */
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
