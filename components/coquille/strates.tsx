"use client";

import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { hauteurDuFondu } from "@/lib/domain/fondu-de-passage";
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
 * **Elle ne fait pas la transition à elle seule, et elle ne l'a jamais pu.**
 * Entre le papier et l'ombre, l'écart de valeur est de six centièmes et la
 * bande suffit. Entre deux surfaces éloignées — vers la roche, ou vers une
 * surface colorée —, la même bande devient une coupure nette : on lit une
 * bordure posée entre deux blocs, pas un passage. Un fondu s'ouvre donc
 * au-dessus d'elle, proportionnel à l'écart, et la couleur tourne là ; la
 * strate retrouve son rôle de ligne de crête. Entre papier et ombre le fondu
 * vaut zéro, et rien ne change de ce que la production sert aujourd'hui.
 * Voir `hauteurDuFondu`.
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
 * Ce que la strate voit arriver sous elle.
 *
 * Sans fondu, c'est la surface du dessus, et rien n'a changé. Avec fondu, la
 * couleur a déjà presque tourné quand la bande commence : les veines doivent
 * donc se calculer depuis **là**, et non depuis une surface de départ que
 * l'écran ne montre plus à cette hauteur. Les calculer depuis `de` ferait
 * remonter la couleur d'origine juste sous le dégradé qui vient de s'en
 * éloigner — une marche à l'envers, exactement ce que le fondu vient enlever.
 */
function departDeLaBande(de: Surface, vers: Surface, fondu: number): string {
  if (fondu === 0) return variableDe(de);

  return `color-mix(in oklab, ${variableDe(de)} 12%, ${variableDe(vers)})`;
}

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

  const fondu = hauteurDuFondu(de, vers);
  const depart = departDeLaBande(de, vers, fondu);
  const veine = (fond: string, part: number) =>
    `color-mix(in oklab, ${fond} ${part}%, var(--stone-500))`;

  return (
    <div ref={bande} aria-hidden className="relative w-full">
      {/* Le fondu, quand l'écart le demande : la couleur tourne ici, avant que
          la strate se pose. Il porte le grain du panneau qu'il quitte, sinon la
          texture s'arrête net à la hauteur même où l'on travaille à ce qu'il n'y
          ait plus de couture. Voir `hauteurDuFondu`. */}
      {fondu > 0 ? (
        <div
          className="grain relative w-full"
          style={{
            height: `${fondu}px`,
            background: `linear-gradient(to bottom, ${variableDe(de)} 0%, ${depart} 100%)`,
          }}
        />
      ) : null}

      <div
        className={`relative h-8 w-full md:h-14 ${fondu > 0 ? "" : SURFACES[de].fond}`}
        style={fondu > 0 ? { background: depart } : undefined}
      >
        <svg
          viewBox={`0 0 ${LARGEUR_STRATES} ${HAUTEUR_STRATES}`}
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full"
        >
          <motion.path
            d={veines[0]}
            fill={veine(depart, 78)}
            style={immobile ? undefined : { y: deriveHaute }}
          />
          <motion.path
            d={veines[1]}
            fill={veine(variableDe(vers), 62)}
            style={immobile ? undefined : { y: deriveBasse }}
          />
          {/* La coupe, elle, ne bouge pas : c'est elle qui porte la surface du
              panneau du dessous jusqu'en bas de la bande. La décaler d'un quart
              d'unité vers le haut découvrirait, sur la dernière ligne de pixels,
              la couleur de la veine — une couture d'un pixel exactement là où
              tout ce dessin sert à ne pas en avoir. */}
          <path d={coupe} fill={variableDe(vers)} />
        </svg>
      </div>
    </div>
  );
}
