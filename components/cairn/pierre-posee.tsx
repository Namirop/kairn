"use client";

import { motion } from "motion/react";
import type { Pierre } from "@/lib/domain/cairn-stack";

/**
 * Une pierre de l'empilement, à sa place.
 *
 * La position finale passe par l'attribut `transform` du SVG : elle est donc en
 * unités de viewBox. L'animation, elle, est une transformation CSS — en pixels —
 * d'où les pourcentages, relatifs à la boîte de la pierre.
 */

const NUANCES = ["fill-stone-900", "fill-stone-800", "fill-stone-700"] as const;

const POSE = { y: "0%", rotate: 0, opacity: 1 } as const;

export function PierrePosee({
  pierre,
  rang,
  derniere,
  anime,
}: {
  pierre: Pierre;
  rang: number;
  derniere: boolean;
  anime: boolean;
}) {
  const depart = derniere
    ? { y: "-140%", rotate: -7, opacity: 0 }
    : { y: "-40%", rotate: 0, opacity: 0 };

  return (
    <g transform={`translate(${pierre.x} ${pierre.y}) rotate(${pierre.rotation})`}>
      <motion.g
        // Remonter le groupe quand l'animation devient possible est ce qui
        // permet de partir de l'état posé : `initial` n'est lu qu'au montage.
        key={anime ? "chute" : "posee"}
        style={{ transformBox: "fill-box", transformOrigin: "center" }}
        initial={anime ? depart : false}
        animate={POSE}
        transition={{
          duration: derniere ? 0.42 : 0.3,
          delay: rang * 0.06,
          ease: [0.2, 0.8, 0.2, 1],
        }}
      >
        <ArêtesDePierre pierre={pierre} derniere={derniere} />
      </motion.g>
    </g>
  );
}

/** Le tracé de la pierre, et l'arête de lichen sur la dernière posée. */
export function ArêtesDePierre({ pierre, derniere }: { pierre: Pierre; derniere: boolean }) {
  return (
    <>
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
    </>
  );
}
