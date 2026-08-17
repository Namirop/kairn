"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion, type Transition } from "motion/react";

/**
 * Comment la page publique arrive : en plusieurs temps, et une seule fois.
 *
 * Rien n'y clignote et rien n'y rebondit. Le mouvement fait une chose et une
 * seule : il **donne un ordre de lecture**. « Tu lis beaucoup » puis « Tu retiens
 * peu » n'est pas un titre de deux lignes, c'est un constat et son retournement ;
 * les afficher ensemble laisse l'œil choisir par où commencer, les décaler d'un
 * dixième de seconde ne lui laisse pas le choix. C'est la seule chose que cette
 * animation-là achète, et c'est assez.
 *
 * D'où les réglages : quatorze pixels de montée, pas cinquante — un déplacement
 * qu'on sent sans le regarder ; aucune échelle, aucune rotation, aucun flou ;
 * `once`, parce qu'un panneau qui rejoue son entrée à chaque remontée devient un
 * carrousel. Et rien ne part avant d'être en vue : au chargement, l'ouverture est
 * déjà dans le pli, donc elle joue tout de suite, et les panneaux du dessous
 * attendent qu'on descende jusqu'à eux.
 *
 * **Quand le mouvement est refusé, il n'y a pas d'animation dégradée : il n'y en a
 * pas.** Les deux composants rendent alors un simple bloc, sans opacité initiale
 * ni transformation — pas même une transition « instantanée », qui laisse toujours
 * une classe et un style à zéro sur chaque élément de la page.
 */

/** Un déplacement qu'on sent sans le regarder. */
const MONTEE_PX = 14;

/** Le temps d'un élément, et l'écart entre deux. */
const DUREE_S = 0.55;
const ECART_S = 0.09;

/** Sortie douce, sans retour : ça se pose, ça ne rebondit pas. */
const COURBE: Transition["ease"] = [0.2, 0.8, 0.2, 1];

const TEMPS = {
  cache: { opacity: 0, y: MONTEE_PX },
  visible: { opacity: 1, y: 0, transition: { duration: DUREE_S, ease: COURBE } },
};

/**
 * La suite : elle ne bouge pas elle-même, elle cadence ses `Temps`.
 *
 * `attente` retarde le premier temps. Elle sert quand deux suites se répondent
 * dans la même vue — la colonne de texte de l'ouverture et l'empilement à côté
 * d'elle, qui ne doivent pas démarrer ensemble.
 */
export function Apparition({
  attente = 0,
  className,
  children,
}: {
  attente?: number;
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
      variants={{ visible: { transition: { staggerChildren: ECART_S, delayChildren: attente } } }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Un temps de la suite. Hors d'une `Apparition`, il ne fait rien.
 *
 * `balise` existe pour les temps qui vivent **dans** un texte : le modèle de
 * contenu d'un titre n'admet que du texte, et y glisser une division produit un
 * document invalide. Les deux lignes de l'ouverture sont dans son `h1`, donc ce
 * sont des `span` — à charge de l'appelant de les passer en bloc s'il veut deux
 * lignes.
 */
export function Temps({
  balise = "div",
  className,
  children,
}: {
  balise?: "div" | "span";
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
    <Bloc className={className} variants={TEMPS}>
      {children}
    </Bloc>
  );
}
