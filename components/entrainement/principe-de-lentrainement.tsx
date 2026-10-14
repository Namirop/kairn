"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

/**
 * L'explication du principe, montrée une seule fois, en plein écran : elle dit
 * une chose contre-intuitive, que s'entraîner ne fait pas avancer.
 *
 * Ensuite, une ligne discrète et permanente suffit — voir `TourDentrainement`.
 */
export function PrincipeDeLentrainement({ onCommencer }: { onCommencer: () => void }) {
  const t = useTranslations("revision.entrainement");

  return (
    <section className="mx-auto flex w-full max-w-2xl flex-col">
      <p className="text-mono font-mono tracking-[0.14em] text-stone-500 uppercase">
        {t("intitule")}
      </p>

      <h1 className="mt-pas-4 text-h1-app leading-tight font-bold text-stone-900">
        {t("principe.titre")}
      </h1>

      <div className="mt-pas-6 gap-pas-4 text-corps flex max-w-lg flex-col leading-relaxed text-stone-500">
        <p>{t("principe.pioche")}</p>
        <p>{t("principe.voulu")}</p>
      </div>

      <div className="mt-pas-12">
        <Button onClick={onCommencer} className="w-full sm:w-auto">
          {t("principe.commencer")}
        </Button>
      </div>
    </section>
  );
}
