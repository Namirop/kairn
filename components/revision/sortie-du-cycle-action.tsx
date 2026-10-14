"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

/**
 * « Je maîtrise ça », sous la question de la session du jour.
 *
 * Le geste appartient à la session : il repousse l'échéance et sort le concept
 * du cycle. L'entraînement ne le propose pas, il ne touche pas à la mémoire.
 *
 * Le geste le plus lourd de l'écran : un bouton dessiné, sa conséquence collée
 * à lui, pour qu'elle ne se rapporte à aucune autre action de la rangée.
 */
export function SortieDuCycleAction({
  enCours,
  onSortir,
}: {
  enCours: boolean;
  onSortir: () => void;
}) {
  const t = useTranslations("revision.question.maitrise");

  return (
    <div className="gap-pas-3 flex flex-col sm:flex-row sm:items-center">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={enCours}
        onClick={onSortir}
        /* 44 px sur téléphone : à la hauteur `sm`, il se ratait au doigt. */
        className="max-sm:px-pas-6 self-start max-sm:h-11 sm:self-auto"
      >
        {t("geste")}
      </Button>

      {/* Sans mesure : la phrase tient sur une ligne dès que la colonne a la
          largeur. */}
      <p className="text-petit text-stone-500">{t("precision")}</p>
    </div>
  );
}
