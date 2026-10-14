"use client";

import { useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import { PierrePosee } from "@/components/cairn/pierre-posee";
import { SolDuCairn } from "@/components/cairn/sol-du-cairn";
import { useAnimationPossible } from "@/components/cairn/use-animation-possible";
import { tracerLeSentier } from "@/lib/domain/cairn-sentier";
import { cn } from "@/lib/utils";

/**
 * Le sentier : une pierre par Atom retenu — consolidé, ou archivé sur
 * déclaration. Voir `ETATS_QUI_POSENT_UNE_PIERRE`.
 *
 * `nombre` fait la hauteur, `graines` fait les formes : passer les identifiants
 * des Atoms rend l'empilement propre à chacun et stable dans le temps. Sans
 * graines, le composant reste utilisable à partir d'un simple compteur.
 *
 * Passé un palier, la pierre suivante ouvre un cairn de plus à droite, pour
 * qu'une pile unique ne devienne pas une aiguille. La règle et la géométrie
 * vivent dans `tracerLeSentier`.
 *
 * L'animation est un supplément, jamais un préalable : voir
 * `useAnimationPossible` et `PoseDePierre`.
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
  /** Sur un panneau de roche, les pierres s'inversent en gris clairs. */
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
        // Le décalage du cairn est porté ici, la place de la pierre par son
        // propre groupe : aucune translation à recomposer.
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
