"use client";

import { useMemo } from "react";
import { useReducedMotion } from "motion/react";
import { Cairn } from "@/components/cairn/cairn";
import { ArêtesDePierre } from "@/components/cairn/pierre-posee";
import { SolDuCairn } from "@/components/cairn/sol-du-cairn";
import { useChuteDesPierres } from "@/components/cairn/use-chute-des-pierres";
import { empiler, LARGEUR_VUE } from "@/lib/domain/cairn-stack";
import { cn } from "@/lib/utils";

/**
 * Le cairn de la page publique, que l'on peut faire tomber d'un geste.
 *
 * Réservé au registre marketing : sur le tableau de bord, chaque pierre est un
 * concept que l'utilisateur a consolidé, et le faire tomber d'un mouvement de
 * souris serait un mauvais message. Ici, l'empilement est décoratif.
 *
 * Quand l'utilisateur refuse le mouvement, le composant rend le cairn ordinaire
 * et ne pose aucun gestionnaire : l'effet disparaît entièrement plutôt qu'à
 * moitié.
 */
export function CairnRenversable({
  nombre,
  graines,
  className,
}: {
  nombre: number;
  graines?: string[];
  className?: string;
}) {
  const immobile = useReducedMotion() ?? false;
  const { pierres, hauteur, ySol } = useMemo(() => empiler(nombre, graines), [nombre, graines]);
  const chute = useChuteDesPierres(pierres, !immobile);

  if (immobile) return <Cairn nombre={nombre} graines={graines} className={className} />;

  return (
    <svg
      ref={chute.refSvg}
      viewBox={`0 ${-hauteur + ySol} ${LARGEUR_VUE} ${hauteur}`}
      className={cn("h-full w-full cursor-crosshair", className)}
      onPointerMove={chute.surDeplacement}
      onPointerDown={chute.surAppui}
      onPointerLeave={chute.surSortie}
      role="img"
      aria-label={`Empilement de ${nombre} pierres. Passe la souris au travers pour le faire tomber.`}
    >
      <SolDuCairn />
      {pierres.map((pierre, rang) => (
        <g
          key={pierre.cle}
          ref={(element) => {
            chute.refsGroupes.current[rang] = element;
          }}
          transform={`translate(${pierre.x} ${pierre.y}) rotate(${pierre.rotation})`}
        >
          <ArêtesDePierre pierre={pierre} derniere={rang === pierres.length - 1} />
        </g>
      ))}
    </svg>
  );
}
