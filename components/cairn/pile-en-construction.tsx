"use client";

import { motion, useReducedMotion } from "motion/react";
import { ArêtesDePierre } from "@/components/cairn/aretes-de-pierre";
import { empiler, LARGEUR_VUE } from "@/lib/domain/cairn-stack";
import { cn } from "@/lib/utils";

/**
 * L'attente : un empilement qui se construit.
 *
 * Trois pierres se posent l'une après l'autre, en boucle. Ça dit la même chose
 * qu'un rond qui tourne, dans la langue du produit — et ça dit en plus ce qui
 * est en train de se passer : quelque chose s'empile.
 *
 * La géométrie vient de `empiler`, comme le cairn et le compteur de session.
 * Sous `prefers-reduced-motion`, les pierres restent posées : une attente
 * immobile vaut mieux qu'une animation qu'on n'a pas demandée.
 */

const PIERRES = 3;

export function PileEnConstruction({ className }: { className?: string }) {
  const immobile = useReducedMotion() ?? false;
  const { pierres, hauteur, ySol } = empiler(
    PIERRES,
    Array.from({ length: PIERRES }, (_, index) => `attente-${index}`),
  );

  return (
    <svg
      viewBox={`0 ${-hauteur + ySol} ${LARGEUR_VUE} ${hauteur}`}
      className={cn("h-auto w-12", className)}
      role="img"
      aria-label="Travail en cours"
    >
      {pierres.map((pierre, rang) => (
        <motion.g
          key={pierre.cle}
          transform={`translate(${pierre.x} ${pierre.y}) rotate(${pierre.rotation})`}
          style={{ transformBox: "fill-box", transformOrigin: "center" }}
          initial={false}
          animate={immobile ? { opacity: 1 } : { opacity: [0.15, 1, 1, 0.15] }}
          transition={
            immobile
              ? undefined
              : {
                  duration: 2.4,
                  times: [0, 0.25, 0.75, 1],
                  delay: rang * 0.3,
                  repeat: Infinity,
                  repeatDelay: 0.3,
                  ease: "easeInOut",
                }
          }
        >
          <ArêtesDePierre pierre={pierre} derniere={false} />
        </motion.g>
      ))}
    </svg>
  );
}
