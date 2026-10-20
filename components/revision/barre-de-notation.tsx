"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import type { ReviewRating } from "@/lib/db/types";

/**
 * La notation, lue comme une graduation. Aucun niveau mis en avant : ce serait
 * suggérer une réponse, et pousser vers le haut fausserait la planification du
 * concept. Deux colonnes sur mobile, sinon la question sortirait de l'écran.
 */

/** Dans l'ordre de la graduation. */
export const NIVEAUX: ReviewRating[] = ["AGAIN", "HARD", "GOOD", "EASY"];

export function BarreDeNotation({
  enCours,
  onNoter,
}: {
  enCours: boolean;
  onNoter: (note: ReviewRating) => void;
}) {
  const t = useTranslations("revision.question.notation");

  return (
    <div>
      <p className="text-corps text-stone-900">{t("question")}</p>

      <div className="gap-pas-2 mt-pas-3 grid grid-cols-2 sm:grid-cols-4">
        {NIVEAUX.map((note) => (
          <Button
            key={note}
            type="button"
            variant="outline"
            disabled={enCours}
            onClick={() => onNoter(note)}
            className="py-pas-3 h-auto w-full text-center font-normal whitespace-normal"
          >
            {t(note)}
          </Button>
        ))}
      </div>

      {/* Masqué au lecteur d'écran, qui a déjà les libellés dans l'ordre. */}
      <div
        aria-hidden
        className="mt-pas-2 text-mono hidden justify-between font-mono text-stone-500 sm:flex"
      >
        <span>{t("oublie")}</span>
        <span>{t("immediat")}</span>
      </div>
    </div>
  );
}
