"use client";

import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useSpring, useTransform } from "motion/react";
import type { MotionValue } from "motion/react";

/**
 * Le sentier qui se trace pendant qu'on le descend, à la vitesse du défilement.
 * Un ressort le suit, sinon chaque cran de molette se verrait comme un saut.
 *
 * Un segment par intervalle entre deux pierres : les étapes n'ont pas la même
 * hauteur, et un trait continu ne saurait pas où s'arrêter sans mesurer la page.
 *
 * Les pierres grandissent depuis leur axe plutôt qu'en fondu, qui aurait l'air
 * d'un chargement.
 *
 * Mouvement réduit : le trait est entier et les pierres posées dès le premier
 * rendu. Rien de ce qui se lit ne dépend de l'animation.
 */

export type EtapeDuSentier = { titre: string; texte: string };

/** La part de la traversée pendant laquelle le trait se dessine. */
const FIN_DU_TRACE = 0.9;

/** Amorti fort : le trait suit la molette, il ne la dépasse jamais. */
const RESSORT = { stiffness: 90, damping: 24, restDelta: 0.001 };

/**
 * De combien une pierre se pose avant que le trait la touche : l'œil suit la
 * tête du trait, et une pierre qui attend le contact paraît en retard.
 */
const AVANCE_DE = 0.12;

export function TraceDuSentier({ etapes }: { etapes: EtapeDuSentier[] }) {
  const colonne = useRef<HTMLOListElement>(null);
  const immobile = useReducedMotion() ?? false;

  // La traversée va de la liste qui commence à paraître à la liste entièrement
  // en vue, pas jusqu'à sa sortie par le haut : le trait doit être fini quand
  // on a tout sous les yeux, pas une fois la section quittée.
  const { scrollYProgress } = useScroll({
    target: colonne,
    offset: ["start 0.8", "end 0.9"],
  });

  const avance = useSpring(
    useTransform(scrollYProgress, [0, FIN_DU_TRACE], [0, 1], { clamp: true }),
    RESSORT,
  );

  const intervalles = Math.max(1, etapes.length - 1);

  return (
    <ol ref={colonne}>
      {etapes.map((etape, rang) => (
        <li key={etape.titre} className="gap-pas-6 pb-pas-8 relative flex last:pb-0">
          {rang < etapes.length - 1 ? (
            <Segment
              avance={avance}
              anime={!immobile}
              debut={rang / intervalles}
              pas={intervalles}
            />
          ) : null}

          {/* Posée sur l'axe optique du titre, pas sur son bord haut. */}
          <Marqueur avance={avance} anime={!immobile} part={rang / intervalles} />

          <div>
            <h3 className="text-h2-app leading-tight font-bold">{etape.titre}</h3>
            <p className="mt-pas-2 text-stone-500">{etape.texte}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

/** Le trait entre deux pierres. Il se remplit du haut vers le bas. */
function Segment({
  avance,
  anime,
  debut,
  pas,
}: {
  avance: MotionValue<number>;
  anime: boolean;
  debut: number;
  pas: number;
}) {
  const rempli = useTransform(avance, [debut, debut + 1 / pas], [0, 1], { clamp: true });

  return (
    <span aria-hidden className="top-pas-6 absolute bottom-0 left-[7px] w-0.5 overflow-hidden">
      <motion.span
        className="block h-full w-full origin-top bg-stone-300"
        style={anime ? { scaleY: rempli } : undefined}
      />
    </span>
  );
}

/** Une pierre du sentier, posée quand le trait l'atteint. */
function Marqueur({
  avance,
  anime,
  part,
}: {
  avance: MotionValue<number>;
  anime: boolean;
  part: number;
}) {
  const echelle = useTransform(avance, [Math.max(0, part - AVANCE_DE), part + 0.02], [0, 1], {
    clamp: true,
  });

  return (
    <motion.span
      aria-hidden
      className="mt-pas-3 relative z-10 h-2 w-4 shrink-0 origin-center rounded-xs bg-stone-900"
      style={anime ? { scaleX: echelle, scaleY: echelle } : undefined}
    />
  );
}
