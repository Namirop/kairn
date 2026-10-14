"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { rejoindreListeDattenteAction } from "@/app/(app)/depots/actions";
import { Button } from "@/components/ui/button";

/**
 * Se signaler quand la limite gêne et qu'aucune offre n'y répond : à qui paie
 * déjà, ou à qui bute sur le nombre de dépôts. Un compte gratuit arrêté par les
 * concepts a une offre, et ne voit pas ce bloc.
 *
 * Le bouton nomme la limite (`motif`) : deux plafonds cohabitent sur l'écran.
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
