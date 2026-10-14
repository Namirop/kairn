"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

/**
 * Renoncer à une question. Sans cette sortie, un texte à trou dont le terme ne
 * revient pas pousse à inventer une saisie fausse, qui écrit un passage
 * mensonger. Discret et sous la réponse — renoncer doit rester moins
 * confortable que chercher —, il disparaît dès qu'une réponse existe.
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
        /* Discret mais pas petit : 44 px de haut sur téléphone. Le rembourrage
           gauche est repris en marge négative pour aligner le mot sur le bord
           du contenu et sur l'autre sortie. */
        className="max-sm:px-pas-4 -ml-pas-4 max-sm:h-11"
      >
        {t("jeterLaPierre")}
      </Button>
    </div>
  );
}
