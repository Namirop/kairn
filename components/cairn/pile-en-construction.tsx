"use client";

import { motion, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import { ArêtesDePierre } from "@/components/cairn/aretes-de-pierre";
import { empiler, LARGEUR_VUE } from "@/lib/domain/cairn-stack";
import { cn } from "@/lib/utils";

/**
 * L'attente : trois pierres qui se posent l'une après l'autre, en boucle. La
 * géométrie vient de `empiler`. Sous `prefers-reduced-motion`, les pierres
 * restent posées.
 */

const PIERRES = 3;

export function PileEnConstruction({
  className,
  clair = false,
}: {
  className?: string;
  /** Sur un panneau de roche, les pierres s'inversent en gris clairs. */
  clair?: boolean;
}) {
  const t = useTranslations("tableau.cairn");
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
      aria-label={t("travailEnCours")}
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
          <ArêtesDePierre pierre={pierre} derniere={false} clair={clair} />
        </motion.g>
      ))}
    </svg>
  );
}
