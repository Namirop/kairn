"use client";

import type { ReactNode } from "react";
import { motion } from "motion/react";

/**
 * Comment une pierre se pose ; le sommet vient de plus haut, penché, plus
 * lentement. N'anime que son contenu : la place est portée par le groupe
 * parent, que la physique déplace aussi, et deux animations ne se disputent
 * pas un `transform`.
 */

const POSE = { y: "0%", rotate: 0, opacity: 1 } as const;

/** Assez pour compter, trop peu pour attendre. */
const ECART_S = 0.06;
/** Budget de la pose entière : au-delà d'une quinzaine de pierres, l'écart se resserre. */
const ETALEMENT_MAX_S = 0.9;

function retardDe(rang: number, total: number): number {
  return rang * Math.min(ECART_S, ETALEMENT_MAX_S / Math.max(total - 1, 1));
}

export function PoseDePierre({
  rang,
  total,
  derniere,
  anime,
  children,
}: {
  rang: number;
  /** Pierres du dessin entier : c'est lui qui tient dans le budget, pas chaque pierre. */
  total: number;
  derniere: boolean;
  /** Faux, la pierre est rendue posée et rien ne bouge. */
  anime: boolean;
  children: ReactNode;
}) {
  const depart = derniere
    ? { y: "-140%", rotate: -7, opacity: 0 }
    : { y: "-40%", rotate: 0, opacity: 0 };

  return (
    <motion.g
      // Remonté quand l'animation devient possible : `initial` n'est lu qu'au montage.
      key={anime ? "chute" : "posee"}
      style={{ transformBox: "fill-box", transformOrigin: "center" }}
      initial={anime ? depart : false}
      animate={POSE}
      transition={{
        duration: derniere ? 0.42 : 0.3,
        delay: retardDe(rang, total),
        ease: [0.2, 0.8, 0.2, 1],
      }}
    >
      {children}
    </motion.g>
  );
}
