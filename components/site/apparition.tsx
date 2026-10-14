"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion, type Transition } from "motion/react";

/**
 * Comment la page publique arrive : en plusieurs temps, une seule fois. Le
 * mouvement ne sert qu'à donner un ordre de lecture (le constat, puis son
 * retournement) : pas d'échelle, de rotation ni de flou, et `once` pour qu'un
 * panneau ne rejoue pas son entrée à chaque remontée.
 *
 * Mouvement réduit : un simple bloc, sans opacité initiale ni transformation —
 * même une transition « instantanée » laisserait un style à zéro sur chaque
 * élément.
 */

/** Un déplacement qu'on sent sans le regarder. */
const MONTEE_PX = 14;

/** Le temps d'un élément, et l'écart entre deux. */
const DUREE_S = 0.55;
const ECART_S = 0.09;

/** Sortie douce, sans retour : ça se pose, ça ne rebondit pas. */
const COURBE: Transition["ease"] = [0.2, 0.8, 0.2, 1];

/** La même, mais qui s'arrête plus franchement : une pierre qu'on cale. */
const COURBE_PIERRE: Transition["ease"] = [0.16, 0.9, 0.2, 1];

const TEMPS = {
  cache: { opacity: 0, y: MONTEE_PX },
  visible: { opacity: 1, y: 0, transition: { duration: DUREE_S, ease: COURBE } },
};

/**
 * Le temps d'une ligne de titre : elle descend sur la précédente, comme une
 * pierre sur le cairn, là où le reste de la page monte. Inverser le sens
 * suffit à ce qu'on ne reconnaisse plus le geste. Son écart, plus long, se
 * règle par `ecart` sur l'`Apparition`.
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
 * La suite : elle ne bouge pas elle-même, elle cadence ses `Temps`.
 * `attente` retarde le premier temps, pour deux suites qui se répondent dans la
 * même vue.
 */
export function Apparition({
  attente = 0,
  ecart = ECART_S,
  className,
  children,
}: {
  attente?: number;
  /** L'écart entre deux temps. Les titres qui s'empilent le veulent plus long. */
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
 * Un temps de la suite. Hors d'une `Apparition`, il ne fait rien.
 *
 * `balise="span"` pour un temps à l'intérieur d'un titre, dont le modèle de
 * contenu n'admet pas de `div` ; à l'appelant de le passer en bloc.
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
