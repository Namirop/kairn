"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { rejoindreListeDattenteAction } from "@/app/(app)/depots/actions";
import { Button } from "@/components/ui/button";

/**
 * Quand aucune offre ne répond à la limite : qui paie déjà, ou bute sur les
 * dépôts. Le bouton nomme la limite : deux plafonds cohabitent sur l'écran.
 */

export function ListeDattente({
  inscrit,
  motif,
}: {
  inscrit: boolean;
  motif: "concepts" | "depots";
}) {
  const t = useTranslations("depots.formulaire.listeDattente");
  const [fait, rejoindre, enCours] = useActionState(async () => {
    await rejoindreListeDattenteAction();
    return true;
  }, inscrit);

  if (fait) {
    return <p className="text-petit text-pretty text-stone-500">{t("note", { motif })}</p>;
  }

  return (
    <form action={rejoindre}>
      <Button type="submit" variant="outline" size="sm" disabled={enCours}>
        {t("prevenir", { motif })}
      </Button>
    </form>
  );
}
