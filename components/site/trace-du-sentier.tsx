"use client";

import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useSpring, useTransform } from "motion/react";
import type { MotionValue } from "motion/react";

/**
 * Le sentier qui se trace pendant qu'on le descend.
 *
 * C'est la seule animation du site qui ne soit pas une entrée, et c'est ce qui la
 * rend juste ici : le trait relie trois étapes qui s'enchaînent, on le lit de haut
 * en bas, et il avance à la vitesse à laquelle on avance. Un trait qui se
 * dessinerait tout seul à l'arrivée dans la vue serait une animation posée sur le
 * contenu ; celui-là **est** le contenu.
 *
 * La traversée est **serrée sur la position de lecture** et non sur l'entrée et la
 * sortie complètes du bloc : mesurée du moment où la liste touche le bas de la
 * fenêtre à celui où elle en sort par le haut, elle dure une fenêtre et demie, si
 * bien que le trait était encore à la moitié alors que la section était lue depuis
 * longtemps. Il se dessine donc pendant que la liste vient se placer, et il est
 * fini quand elle est en face de l'œil. Un ressort le suit, sinon chaque cran de
 * molette se verrait comme un saut.
 *
 * Le trait est découpé en segments, un par intervalle entre deux pierres, parce
 * que les étapes n'ont pas la même hauteur : un seul trait continu ne saurait pas
 * où s'arrêter sans qu'on mesure la page. Les jointures ne se voient pas — les
 * segments sont contigus, de la même teinte, et chacun finit là où le suivant
 * commence.
 *
 * Les pierres sont des marqueurs et non des décorations : chacune se pose quand le
 * trait l'atteint. L'échelle part de zéro plutôt que l'opacité — une pierre qui
 * apparaît en fondu a l'air d'un état de chargement, une pierre qui grandit depuis
 * son axe a l'air d'être posée.
 *
 * Mouvement refusé : le trait est entier et les pierres sont posées dès le premier
 * rendu. Rien de ce qui se lit ne dépend de l'animation.
 */

export type EtapeDuSentier = { titre: string; texte: string };

/** La part de la traversée pendant laquelle le trait se dessine. */
const FIN_DU_TRACE = 0.85;

/** Amorti fort : le trait suit la molette, il ne la dépasse jamais. */
const RESSORT = { stiffness: 90, damping: 24, restDelta: 0.001 };

/**
 * De combien une pierre se pose avant que le trait la touche.
 *
 * L'œil suit la tête du trait et non son extrémité exacte : une pierre qui attend
 * le contact paraît en retard.
 */
const AVANCE_DE = 0.12;

export function TraceDuSentier({ etapes }: { etapes: EtapeDuSentier[] }) {
  const colonne = useRef<HTMLOListElement>(null);
  const immobile = useReducedMotion() ?? false;

  // La traversée retenue : de la liste arrivant en bas de fenêtre à la liste en
  // position de lecture, et non son entrée et sa sortie complètes.
  const { scrollYProgress } = useScroll({
    target: colonne,
    offset: ["start 0.85", "end 0.55"],
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

          {/* Posée sur l'axe optique du titre, pas sur son bord haut : à `pas-2`
              la pierre flottait trois pixels au-dessus de la ligne qu'elle est
              censée marquer, et l'œil le voyait sans savoir le nommer. */}
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
