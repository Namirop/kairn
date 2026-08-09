"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "motion/react";
import { PierrePosee } from "@/components/cairn/pierre-posee";
import { SolDuCairn } from "@/components/cairn/sol-du-cairn";
import { empiler, LARGEUR_VUE } from "@/lib/domain/cairn-stack";
import { cn } from "@/lib/utils";

/**
 * L'empilement de pierres. Une pierre par Atom consolidé.
 *
 * `nombre` fait la hauteur, `graines` fait les formes : passer les identifiants
 * des Atoms rend l'empilement propre à chacun et stable dans le temps. Sans
 * graines, le composant reste utilisable à partir d'un simple compteur.
 *
 * La pierre du sommet se pose en arrivant : c'est celle qu'on vient de gagner,
 * et son arête porte le lichen.
 *
 * L'animation est un supplément, jamais un préalable : l'empilement est rendu
 * posé, et ne s'anime que si la page est effectivement regardée. Un onglet
 * ouvert en arrière-plan suspend les rAF ; s'il fallait une animation pour
 * révéler les pierres, elles y resteraient invisibles.
 */

/** Vrai quand la page est regardée et que l'utilisateur accepte le mouvement. */
function useAnimationPossible(immobile: boolean): boolean {
  const [possible, setPossible] = useState(false);

  useEffect(() => {
    if (immobile || document.hidden) return;
    setPossible(true);
  }, [immobile]);

  return possible;
}

export function Cairn({
  nombre,
  graines,
  className,
}: {
  nombre: number;
  graines?: string[];
  className?: string;
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
      <SolDuCairn />
      {pierres.map((pierre, rang) => (
        <PierrePosee
          key={pierre.cle}
          pierre={pierre}
          rang={rang}
          derniere={rang === pierres.length - 1}
          anime={anime}
        />
      ))}
    </svg>
  );
}
