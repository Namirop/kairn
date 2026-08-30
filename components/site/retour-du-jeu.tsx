"use client";

import { motion } from "motion/react";
import type { FinDuCairn } from "@/lib/domain/score-du-cairn";

/**
 * Ce que le jeu répond par-dessus l'aire : le gain d'une pierre, le mot d'une
 * pile finie.
 *
 * Les deux passent et s'en vont. Un compteur dit déjà où l'on en est, en
 * permanence, sous l'aire ; ce qui manquait est le retour **du geste** — savoir
 * au moment où l'on pose que la visée a payé, sans avoir à chercher un chiffre
 * ailleurs. Un retour qui resterait affiché finirait par recouvrir le cairn
 * qu'on vient de monter.
 *
 * Rien ici n'est annoncé aux lecteurs d'écran : l'aire porte déjà un libellé qui
 * dit l'état de la pile, et doubler chaque pose d'une annonce ferait parler la
 * page à chaque appui pendant qu'on attend son dépôt.
 */

/**
 * Le gain d'une pose : il apparaît sur la pierre, monte, et disparaît.
 *
 * La visée juste porte l'accent, le posé de travers reste au gris de second
 * plan. C'est le seul endroit où la différence entre les deux se lit d'un coup
 * d'œil — dans la pile, elle ne se voit qu'à l'inclinaison.
 *
 * Le composant se remonte à chaque pose, par sa clé : c'est ce qui rejoue
 * l'animation plutôt que de la laisser figée sur la dernière image.
 */
export function GainDePoints({
  gain,
  parfait,
  gauche,
  haut,
}: {
  gain: number;
  parfait: boolean;
  /** Position sur l'aire, en pourcentage de sa largeur et de sa hauteur. */
  gauche: string;
  haut: string;
}) {
  return (
    <motion.span
      aria-hidden
      style={{ left: gauche, top: haut }}
      className={`text-mono pointer-events-none absolute -translate-x-1/2 font-mono font-medium tabular-nums ${
        parfait ? "text-lichen-deep" : "text-stone-500"
      }`}
      initial={{ opacity: 0, y: 0, scale: 0.7 }}
      animate={{ opacity: [0, 1, 1, 0], y: [0, -8, -16, -28], scale: [0.7, 1.12, 1, 1] }}
      transition={{ duration: 1.05, times: [0, 0.16, 0.5, 1], ease: "easeOut" }}
    >
      +{gain}
    </motion.span>
  );
}

/**
 * Le mot d'une pile montée.
 *
 * Il constate, il ne félicite pas : « toutes d'aplomb » est un fait, et c'est le
 * fait qui récompense. Le mot fort est réservé à la pile entière — dilué sur
 * « presque », il ne dirait plus rien.
 */
export function MotDeFin({ fin }: { fin: FinDuCairn }) {
  return (
    // Un `span` et non un `p` : l'aire de jeu est un bouton, dont le contenu ne
    // peut être que du texte. Un paragraphe y passerait au rendu et casserait à
    // l'hydratation.
    <motion.span
      aria-hidden
      className="rounded-galet bg-surface-papier px-pas-3 py-pas-1 text-petit absolute top-[14%] left-1/2 block -translate-x-1/2 whitespace-nowrap text-stone-900"
      initial={{ opacity: 0, y: 10, scale: 0.94 }}
      animate={{ opacity: [0, 1, 1, 0], y: [10, 0, 0, -6], scale: [0.94, 1, 1, 1] }}
      transition={{ duration: 2.2, times: [0, 0.12, 0.78, 1], ease: "easeOut" }}
    >
      {fin === "PARFAIT" ? "Toutes d'aplomb." : "Le cairn tient."}
    </motion.span>
  );
}
