"use client";

import type { ReactNode } from "react";
import { motion } from "motion/react";

/**
 * Comment une pierre se pose.
 *
 * Les pierres du bas descendent de peu et se posent presque ensemble ; celle du
 * sommet vient de plus haut, penchée, et met un peu plus longtemps. C'est ce qui
 * fait qu'un cairn qui apparaît raconte quelque chose : l'empilement était déjà
 * là, et la dernière pierre est celle qu'on vient d'ajouter.
 *
 * Le geste vit ici et non dans les deux composants qui en ont besoin — celui du
 * tableau de bord, où chaque pierre est un concept acquis, et celui de la page
 * publique, qu'on peut renverser d'un mouvement de souris. Écrit deux fois, il
 * aurait deux durées au bout de trois passes.
 *
 * **Il n'anime que son contenu, jamais sa position.** La place de la pierre dans
 * l'empilement est portée par le groupe du dessus, en unités de `viewBox` ; sur la
 * page publique, c'est aussi ce groupe-là que la physique déplace quand on
 * traverse l'empilement. Les deux ne se disputent donc rien : le parent place, ce
 * composant pose.
 */

/** L'état posé. Tout part de plus haut et y revient. */
const POSE = { y: "0%", rotate: 0, opacity: 1 } as const;

/** L'écart entre deux pierres. Assez pour compter, trop peu pour attendre. */
const ECART_S = 0.06;
/**
 * Ce que la pose entière ne dépasse jamais, en secondes.
 *
 * L'écart fixe convient à sept pierres et ne dit plus rien à cinquante : le
 * sentier mettrait trois secondes à se poser pendant qu'on lit sa journée. Au
 * delà d'une quinzaine de pierres, l'écart se resserre donc pour tenir dans ce
 * budget. En deçà, rien ne change — c'est le minimum des deux.
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
