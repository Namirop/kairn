"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";

/**
 * La réponse de référence, sur la roche : la carte de la question est claire et
 * demande, ce bloc est sombre et répond.
 *
 * Ce bloc ne se fait pas défiler à l'écran lui-même : c'est `SuiteDeLaQuestion`
 * qui s'en charge, pour amener aussi le bouton qui le suit au-dessus de la
 * barre du bas d'un téléphone.
 */
export function BlocReponse({
  intitule,
  children,
}: {
  /** Absent, le bloc s'intitule « La réponse ». */
  intitule?: string;
  children: ReactNode;
}) {
  const t = useTranslations("revision.question");

  return (
    <div className="rounded-carte bg-surface-roche grain grain-clair p-pas-6 md:p-pas-8 relative overflow-hidden">
      {/* Les jetons de code s'inversent ici, et seulement ici : de l'encre diluée
          sur la roche est plus sombre que la roche, donc invisible. */}
      {/* À partir de `sm`, l'intitulé passe dans une colonne de marge, comme
          une glose : elle occupe la largeur sans allonger les lignes du texte.
          En dessous, il repasse au-dessus, la marge mangerait la moitié de la
          ligne. */}
      <div className="[&_code]:bg-jeton-clair [&_code]:border-jeton-bord-clair gap-pas-3 sm:gap-pas-8 relative z-10 flex flex-col sm:grid sm:grid-cols-[8.5rem_1fr] sm:items-start">
        <p className="text-mono font-mono tracking-[0.12em] text-stone-400 uppercase sm:pt-[0.3em]">
          {intitule ?? t("laReponse")}
        </p>

        <div className="text-corps leading-relaxed whitespace-pre-wrap text-stone-50">
          {children}
        </div>
      </div>
    </div>
  );
}
