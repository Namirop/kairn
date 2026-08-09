"use client";

import { motion, useReducedMotion } from "motion/react";
import { empiler, LARGEUR_VUE, type Pierre } from "@/lib/domain/cairn-stack";
import { cn } from "@/lib/utils";

/**
 * L'empilement de pierres. Une pierre par Atom consolidé.
 *
 * `nombre` fait la hauteur, `graines` fait les formes : passer les identifiants
 * des Atoms rend l'empilement propre à chacun et stable dans le temps. Sans
 * graines, le composant reste utilisable à partir d'un simple compteur.
 *
 * La pierre du sommet se pose en arrivant : c'est celle qu'on vient de gagner,
 * et son arête porte le lichen.
 */

const NUANCES = ["fill-stone-900", "fill-stone-800", "fill-stone-700"] as const;

function Pose({
  pierre,
  rang,
  derniere,
  immobile,
}: {
  pierre: Pierre;
  rang: number;
  derniere: boolean;
  immobile: boolean;
}) {
  // La position finale passe par l'attribut `transform` du SVG : elle est donc
  // en unités de viewBox. L'animation, elle, est une transformation CSS — en
  // pixels — d'où les pourcentages, relatifs à la boîte de la pierre.
  const arrivee = { y: "0%", rotate: 0, opacity: 1 };
  const depart = derniere
    ? { y: "-140%", rotate: -7, opacity: 0 }
    : { y: "-40%", rotate: 0, opacity: 0 };

  return (
    <g transform={`translate(${pierre.x} ${pierre.y}) rotate(${pierre.rotation})`}>
      <motion.g
        style={{ transformBox: "fill-box", transformOrigin: "center" }}
        initial={immobile ? arrivee : depart}
        animate={arrivee}
        transition={{
          duration: derniere ? 0.42 : 0.3,
          delay: immobile ? 0 : rang * 0.06,
          ease: [0.2, 0.8, 0.2, 1],
        }}
      >
        <path d={pierre.chemin} className={NUANCES[pierre.nuance]} />
        {derniere ? (
          <path
            d={pierre.chemin}
            className="stroke-lichen"
            strokeWidth={1.4}
            strokeLinecap="round"
            fill="none"
            pathLength={1}
            strokeDasharray="0.34 0.66"
            strokeDashoffset={-0.04}
          />
        ) : null}
      </motion.g>
    </g>
  );
}

export function Cairn({
  nombre,
  graines,
  className,
}: {
  nombre: number;
  graines?: string[];
  className?: string;
}) {
  const immobile = useReducedMotion() ?? false;
  const { pierres, hauteur, ySol } = empiler(nombre, graines);

  return (
    <svg
      viewBox={`0 ${-hauteur + ySol} ${LARGEUR_VUE} ${hauteur}`}
      className={cn("h-full w-full", className)}
      role="img"
      aria-label={
        nombre === 0
          ? "Aucune pierre posée"
          : `Empilement de ${nombre} pierre${nombre > 1 ? "s" : ""}`
      }
    >
      <line
        x1={LARGEUR_VUE * 0.12}
        y1={0}
        x2={LARGEUR_VUE * 0.88}
        y2={0}
        className="stroke-stone-300"
        strokeWidth={1}
      />
      {pierres.map((pierre, rang) => (
        <Pose
          key={pierre.cle}
          pierre={pierre}
          rang={rang}
          derniere={rang === pierres.length - 1}
          immobile={immobile}
        />
      ))}
    </svg>
  );
}
