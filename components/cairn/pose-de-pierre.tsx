"use client";

import type { ReactNode } from "react";
import { motion } from "motion/react";

/**
 * Comment une pierre se pose : celles du bas descendent de peu, presque
 * ensemble ; celle du sommet vient de plus haut, penchée, un peu plus lentement.
 * Partagé par le cairn du tableau de bord et celui de la page publique.
 *
 * Il n'anime que son contenu, jamais sa position : la place de la pierre est
 * portée par le groupe parent, que la physique de la page publique déplace
 * aussi. Les deux ne doivent pas se disputer le même `transform`.
 */

/** L'état posé. Tout part de plus haut et y revient. */
const POSE = { y: "0%", rotate: 0, opacity: 1 } as const;

/** L'écart entre deux pierres. Assez pour compter, trop peu pour attendre. */
const ECART_S = 0.06;
/**
 * Ce que la pose entière ne dépasse jamais, en secondes. Au-delà d'une
 * quinzaine de pierres, l'écart se resserre pour tenir dans ce budget.
 */
const ETALEMENT_MAX_S = 0.9;

/** Le retard d'une pierre, resserré quand l'empilement s'allonge. */
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
      // Remonter le groupe quand l'animation devient possible est ce qui permet
      // de partir de l'état posé : `initial` n'est lu qu'au montage.
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
