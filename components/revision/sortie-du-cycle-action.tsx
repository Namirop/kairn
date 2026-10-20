"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

/**
 * « Je maîtrise ça » : sort le concept du cycle, donc session seulement,
 * l'entraînement ne touche pas à la mémoire. Geste le plus lourd de l'écran, sa
 * conséquence collée à lui pour ne se rapporter à aucune autre action.
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
        /* 44 px sur téléphone : à la hauteur `sm`, il se rate au doigt. */
        className="max-sm:px-pas-6 self-start max-sm:h-11 sm:self-auto"
      >
        {t("geste")}
      </Button>

      {/* Sans mesure : la phrase tient sur une ligne dès que la colonne le permet. */}
      <p className="text-petit text-stone-500">{t("precision")}</p>
    </div>
  );
}
