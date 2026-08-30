"use client";

import { useReducedMotion } from "motion/react";
import { PierrePosee } from "@/components/cairn/pierre-posee";
import { SolDuCairn } from "@/components/cairn/sol-du-cairn";
import { useAnimationPossible } from "@/components/cairn/use-animation-possible";
import { empiler, LARGEUR_VUE } from "@/lib/domain/cairn-stack";
import { cn } from "@/lib/utils";

/**
 * L'empilement de pierres. Une pierre par Atom retenu — consolidé, ou archivé
 * sur déclaration. Voir `ETATS_QUI_POSENT_UNE_PIERRE`.
 *
 * `nombre` fait la hauteur, `graines` fait les formes : passer les identifiants
 * des Atoms rend l'empilement propre à chacun et stable dans le temps. Sans
 * graines, le composant reste utilisable à partir d'un simple compteur.
 *
 * La pierre du sommet se pose en arrivant : c'est celle qu'on vient de gagner,
 * et son arête porte le lichen.
 *
 * L'animation est un supplément, jamais un préalable : c'est ce que dit
 * `useAnimationPossible`, et le geste de la pose vit dans `PoseDePierre`.
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
  const immobile = useReducedMotion() ?? false;
  const anime = useAnimationPossible(immobile);
  const { pierres, hauteur, ySol } = empiler(nombre, graines);

  return (
    <svg
      viewBox={`0 ${-hauteur + ySol} ${LARGEUR_VUE} ${hauteur}`}
      className={cn("h-full w-full", className)}
      role="img"
      aria-label={
        nombre === 0
          ? "Aucune pierre posée"
          : `Empilement de ${nombre} pierre${nombre > 1 ? "s" : ""}`
      }
    >
      <SolDuCairn clair={clair} />
      {pierres.map((pierre, rang) => (
        <PierrePosee
          key={pierre.cle}
          pierre={pierre}
          rang={rang}
          derniere={rang === pierres.length - 1}
          anime={anime}
          clair={clair}
        />
      ))}
    </svg>
  );
}
