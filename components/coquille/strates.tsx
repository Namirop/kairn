"use client";

import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { HAUTEUR_STRATES, LARGEUR_STRATES, strates } from "@/lib/domain/strates";
import { SURFACES, variableDe, type Surface } from "./surfaces";

/**
 * La jointure entre deux panneaux : une coupe de roche.
 *
 * Elle occupe toute la largeur et s'étire — `preserveAspectRatio="none"` — donc
 * la coupe est plus tendue sur un grand écran et plus resserrée sur un
 * téléphone, comme une strate qu'on regarde de plus ou moins loin.
 *
 * Les deux veines se calculent par `color-mix` vers le gris de lichen : aucune
 * couleur n'est inventée ici, elles dérivent toutes des tokens existants. Elles
 * ne se contentent pas d'interpoler entre les deux surfaces — entre le papier
 * et l'ombre, l'écart est si faible qu'un dégradé en trois pas ne se voyait
 * pas. Une strate porte sa propre valeur, plus minérale que les deux panneaux
 * qu'elle sépare, et c'est ce qui la fait lire comme une coupe.
 *
 * Elle bouge quand on la traverse, jamais toute seule. Un mouvement permanent
 * en tâche de fond aurait tiré l'œil vers une jointure pendant qu'on lit le
 * panneau d'à côté ; ici le déplacement est celui du regard, et il s'arrête
 * avec le doigt. Les deux veines dérivent verticalement, la plus haute deux
 * fois plus que l'autre : c'est la différence de vitesse qui fait la
 * profondeur, pas l'amplitude.
 */

/** Dérive de chaque veine sur une traversée complète, en unités de viewBox. */
const DERIVE_HAUTE = 1.3;
const DERIVE_BASSE = 0.6;

/**
 * La coupe, elle, ne bouge pas.
 *
 * C'est elle qui porte la surface du panneau du dessous jusqu'en bas de la
 * bande. La décaler d'un quart d'unité vers le haut découvrirait, sur la
 * dernière ligne de pixels, la couleur de la veine — une couture d'un pixel
 * exactement là où tout ce dessin sert à ne pas en avoir.
 */
export function Strates({ de, vers, graine }: { de: Surface; vers: Surface; graine: string }) {
  const { coupe, veines } = strates(graine);
  const bande = useRef<HTMLDivElement>(null);
  const immobile = useReducedMotion() ?? false;

  const { scrollYProgress } = useScroll({
    target: bande,
    offset: ["start end", "end start"],
  });

  const deriveHaute = useTransform(scrollYProgress, [0, 1], [DERIVE_HAUTE, -DERIVE_HAUTE]);
  const deriveBasse = useTransform(scrollYProgress, [0, 1], [DERIVE_BASSE, -DERIVE_BASSE]);

  const veine = (surface: Surface, part: number) =>
    `color-mix(in oklab, ${variableDe(surface)} ${part}%, var(--stone-500))`;

  return (
    <div ref={bande} aria-hidden className={`relative h-8 w-full md:h-14 ${SURFACES[de].fond}`}>
      <svg
        viewBox={`0 0 ${LARGEUR_STRATES} ${HAUTEUR_STRATES}`}
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full"
      >
        <motion.path
          d={veines[0]}
          fill={veine(de, 78)}
          style={immobile ? undefined : { y: deriveHaute }}
        />
        <motion.path
          d={veines[1]}
          fill={veine(vers, 62)}
          style={immobile ? undefined : { y: deriveBasse }}
        />
        <path d={coupe} fill={variableDe(vers)} />
      </svg>
    </div>
  );
}
