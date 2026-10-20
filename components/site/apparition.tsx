"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion, type Transition } from "motion/react";

/**
 * L'arrivée de la page publique, en plusieurs temps, une seule fois : le
 * mouvement ne donne qu'un ordre de lecture, et `once` évite qu'un panneau
 * rejoue à chaque remontée.
 *
 * Mouvement réduit : un simple bloc, car même une transition « instantanée »
 * laisserait un style initial à zéro.
 */

/** Un déplacement qu'on sent sans le regarder. */
const MONTEE_PX = 14;

const DUREE_S = 0.55;
const ECART_S = 0.09;

/** Sortie douce, sans rebond. */
const COURBE: Transition["ease"] = [0.2, 0.8, 0.2, 1];

/** Plus franche à l'arrêt : une pierre qu'on cale. */
const COURBE_PIERRE: Transition["ease"] = [0.16, 0.9, 0.2, 1];

const TEMPS = {
  cache: { opacity: 0, y: MONTEE_PX },
  visible: { opacity: 1, y: 0, transition: { duration: DUREE_S, ease: COURBE } },
};

/**
 * Une ligne de titre descend sur la précédente, comme une pierre sur le
 * cairn, quand le reste de la page monte. Son écart se règle par `ecart`.
 */
const CHUTE_PIERRE_PX = 56;

const PIERRE = {
  cache: { opacity: 0, y: -CHUTE_PIERRE_PX },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.66, ease: COURBE_PIERRE },
  },
};

/**
 * Ne bouge pas elle-même, cadence ses `Temps`. `attente` décale deux suites
 * qui se répondent dans la même vue.
 */
export function Apparition({
  attente = 0,
  ecart = ECART_S,
  className,
  children,
}: {
  attente?: number;
  /** Plus long pour les titres qui s'empilent. */
  ecart?: number;
  className?: string;
  children: ReactNode;
}) {
  const immobile = useReducedMotion() ?? false;

  if (immobile) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={className}
      initial="cache"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
      variants={{ visible: { transition: { staggerChildren: ecart, delayChildren: attente } } }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Un temps de la suite, inerte hors d'une `Apparition`. `balise="span"` dans
 * un titre, qui n'admet pas de `div` ; à l'appelant de le passer en bloc.
 */
export function Temps({
  balise = "div",
  pierre = false,
  className,
  children,
}: {
  balise?: "div" | "span";
  /** Le temps d'une ligne de titre : elle se pose au lieu d'apparaître. */
  pierre?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const immobile = useReducedMotion() ?? false;
  const Bloc = balise === "span" ? motion.span : motion.div;

  if (immobile) {
    return balise === "span" ? (
      <span className={className}>{children}</span>
    ) : (
      <div className={className}>{children}</div>
    );
  }

  return (
    <Bloc className={className} variants={pierre ? PIERRE : TEMPS}>
      {children}
    </Bloc>
  );
}
