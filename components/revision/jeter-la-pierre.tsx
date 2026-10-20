"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

/**
 * Renoncer à une question : sans cette sortie, un terme qui ne revient pas
 * pousse à une saisie inventée, donc à un passage mensonger. Discret, pour que
 * renoncer reste moins confortable que chercher.
 */
export function JeterLaPierre({ enCours, onJeter }: { enCours: boolean; onJeter: () => void }) {
  const t = useTranslations("revision.question");

  return (
    <div className="sortie-de-secours mt-pas-6">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={enCours}
        onClick={onJeter}
        /* 44 px de haut sur téléphone ; la marge négative aligne le mot sur le
           bord du contenu. */
        className="max-sm:px-pas-4 -ml-pas-4 max-sm:h-11"
      >
        {t("jeterLaPierre")}
      </Button>
    </div>
  );
}
