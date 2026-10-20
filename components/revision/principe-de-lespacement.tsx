"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { espacementVuAction } from "@/app/(app)/reviser/actions";

/**
 * Pourquoi c'est déjà fini, dit une fois, à la fin de la première session.
 * Marquée vue à l'affichage : revenir tant qu'on ne clique pas en ferait une
 * modale déguisée.
 */
export function PrincipeDeLEspacement() {
  const t = useTranslations("revision.paliers.fin");

  useEffect(() => {
    void espacementVuAction();
  }, []);

  return (
    <div className="p-pas-4 md:p-pas-6 rounded-carte bg-surface-ombre">
      <p className="text-corps leading-relaxed text-stone-900">{t("espacement")}</p>
    </div>
  );
}
