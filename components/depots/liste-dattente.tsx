"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { rejoindreListeDattenteAction } from "@/app/(app)/depots/actions";
import { Button } from "@/components/ui/button";

/**
 * Se signaler quand la limite gêne et qu'aucune offre n'y répond.
 *
 * C'est ce qu'on propose à qui paie déjà, ou à qui bute sur le nombre de
 * dépôts : dans les deux cas il n'y a rien à vendre, et la seule suite utile est
 * de savoir que quelqu'un est gêné. Un compte gratuit arrêté par les concepts,
 * lui, a une réponse — il ne voit pas ce bloc.
 *
 * **Le bouton nomme la limite.** Il disait « quand la limite bougera » : deux
 * plafonds cohabitent sur cet écran, et le bouton ne disait pas lequel il
 * visait. Un bouton dit ce qu'il fait, sans que l'on ait à relire la phrase
 * au-dessus pour le deviner.
 *
 * Le seul morceau client de cet écran, isolé pour ça.
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
