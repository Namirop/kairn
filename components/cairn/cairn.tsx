"use client";

import { useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import { PierrePosee } from "@/components/cairn/pierre-posee";
import { SolDuCairn } from "@/components/cairn/sol-du-cairn";
import { useAnimationPossible } from "@/components/cairn/use-animation-possible";
import { tracerLeSentier } from "@/lib/domain/cairn-sentier";
import { cn } from "@/lib/fusion-des-classes";

/**
 * Une pierre par Atom retenu (voir `ETATS_QUI_POSENT_UNE_PIERRE`). `graines` (les
 * ids des Atoms) rend l'empilement propre à chacun et stable ; sans elles, un
 * compteur suffit. Passé un palier, un cairn de plus s'ouvre à droite pour ne
 * pas faire une aiguille (`tracerLeSentier`). L'animation est un supplément,
 * jamais un préalable : voir `useAnimationPossible`.
 */
export function Cairn({
  nombre,
  graines,
  className,
  clair = false,
}: {
  nombre: number;
  graines?: string[];
  className?: string;
  /** Pour un panneau de roche. */
  clair?: boolean;
}) {
  const t = useTranslations("tableau.cairn");
  const immobile = useReducedMotion() ?? false;
  const anime = useAnimationPossible(immobile);
  const { cairns, largeur, hauteur, ySol, total } = tracerLeSentier(nombre, graines);
  const legende =
    total === 0
      ? t("legendeVide")
      : cairns.length > 1
        ? t("legendeSentier", { cairns: cairns.length, total })
        : t("legendePile", { total });

  return (
    <svg
      viewBox={`0 ${-hauteur + ySol} ${largeur} ${hauteur}`}
      className={cn("h-full w-full", className)}
      role="img"
      aria-label={legende}
    >
      <SolDuCairn clair={clair} largeur={largeur} />
      {cairns.map((cairn) => (
        // Le décalage du cairn ici, la place de la pierre dans son groupe :
        // aucune translation à recomposer.
        <g key={cairn.premierRang} transform={`translate(${cairn.decalage} 0)`}>
          {cairn.pierres.map((pierre, rang) => (
            <PierrePosee
              key={pierre.cle}
              pierre={pierre}
              rang={cairn.premierRang + rang}
              total={total}
              derniere={cairn.premierRang + rang === total - 1}
              anime={anime}
              clair={clair}
            />
          ))}
        </g>
      ))}
    </svg>
  );
}
