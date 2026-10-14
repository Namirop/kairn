"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { espacementVuAction } from "@/app/(app)/reviser/actions";

/**
 * Pourquoi c'est déjà fini : l'explication de l'espacement, à la fin de la
 * première session, quand la question se pose. Montrée une seule fois.
 *
 * Marquée vue à l'affichage, sans bouton d'accusé de réception : une
 * explication qui revient tant qu'on ne clique pas serait une modale déguisée.
 */
export function PrincipeDeLEspacement() {
  const t = useTranslations("revision.paliers.fin");

  useEffect(() => {
    void espacementVuAction();
  }, []);

  return (
    // Sans libellé pour l'annoncer, seule une surface le détache du palier.
    <div className="p-pas-4 md:p-pas-6 rounded-carte bg-surface-ombre">
      <p className="text-corps leading-relaxed text-stone-900">{t("espacement")}</p>
    </div>
  );
}
