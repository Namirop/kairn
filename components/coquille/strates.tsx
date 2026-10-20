"use client";

import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { HAUTEUR_STRATES, LARGEUR_STRATES, strates } from "@/lib/domain/strates";
import { SURFACES, variableDe, type Surface } from "./surfaces";

/**
 * La jointure entre deux panneaux. Les veines se mêlent à `--stone-500` plutôt
 * qu'aux deux surfaces : entre papier et ombre, l'écart ne se voit pas. Elles ne
 * bougent qu'au défilement, la haute deux fois plus : l'écart fait la profondeur.
 */

/** Sur une traversée complète, en unités de viewBox. */
const DERIVE_HAUTE = 1.3;
const DERIVE_BASSE = 0.6;

/** La coupe ne bouge pas : décalée, elle découvrirait une couture d'un pixel. */
export function Strates({ de, vers, graine }: { de: Surface; vers: Surface; graine: string }) {
  const { coupe, veines } = strates(graine);
  const bande = useRef<HTMLDivElement>(null);
  const immobile = useReducedMotion() ?? false;

  const { scrollYProgress } = useScroll({
    target: bande,
    offset: ["start end", "end start"],
  });

  const deriveHaute = useTransform(scrollYProgress, [0, 1], [DERIVE_HAUTE, -DERIVE_HAUTE]);
  const deriveBasse = useTransform(scrollYProgress, [0, 1], [DERIVE_BASSE, -DERIVE_BASSE]);

  const veine = (surface: Surface, part: number) =>
    `color-mix(in oklab, ${variableDe(surface)} ${part}%, var(--stone-500))`;

  return (
    <div ref={bande} aria-hidden className={`relative h-8 w-full md:h-14 ${SURFACES[de].fond}`}>
      <svg
        viewBox={`0 0 ${LARGEUR_STRATES} ${HAUTEUR_STRATES}`}
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full"
      >
        <motion.path
          d={veines[0]}
          fill={veine(de, 78)}
          style={immobile ? undefined : { y: deriveHaute }}
        />
        <motion.path
          d={veines[1]}
          fill={veine(vers, 62)}
          style={immobile ? undefined : { y: deriveBasse }}
        />
        <path d={coupe} fill={variableDe(vers)} />
      </svg>
    </div>
  );
}
