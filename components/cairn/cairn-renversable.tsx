"use client";

import { useMemo } from "react";
import { useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import { Cairn } from "@/components/cairn/cairn";
import { ArêtesDePierre } from "@/components/cairn/aretes-de-pierre";
import { PoseDePierre } from "@/components/cairn/pose-de-pierre";
import { BandeDePrise, PriseDuCairn } from "@/components/cairn/prise-du-cairn";
import { SolDuCairn } from "@/components/cairn/sol-du-cairn";
import { useAnimationPossible } from "@/components/cairn/use-animation-possible";
import { useChuteDesPierres } from "@/components/cairn/use-chute-des-pierres";
import { usePriseDuCairn } from "@/components/cairn/use-prise-du-cairn";
import { SANS_BORDS } from "@/lib/domain/cairn-physique";
import { empiler, LARGEUR_VUE } from "@/lib/domain/cairn-empilement";
import { cn } from "@/lib/fusion-des-classes";

/**
 * Le cairn de la page publique, que l'on peut faire tomber d'un geste.
 *
 * Réservé au marketing : sur le tableau de bord, chaque pierre est un concept
 * consolidé, et la faire tomber serait un mauvais message.
 *
 * Sans bords (`SANS_BORDS`, `overflow-visible`) : les pierres peuvent sortir de
 * la fenêtre par un côté ou l'autre.
 *
 * Avec `prefers-reduced-motion`, il rend le cairn ordinaire sans aucun
 * gestionnaire.
 *
 * La pose et la chute ne se gênent pas : la physique déplace le groupe
 * extérieur `<g>`, `PoseDePierre` n'anime que son contenu.
 *
 * Au doigt, voir `PriseDuCairn`.
 */
export function CairnRenversable({
  nombre,
  graines,
  className,
}: {
  nombre: number;
  graines?: string[];
  className?: string;
}) {
  const t = useTranslations("tableau.cairn");
  const immobile = useReducedMotion() ?? false;
  const pose = useAnimationPossible(immobile);
  const { pierres, hauteur, ySol } = useMemo(() => empiler(nombre, graines), [nombre, graines]);
  const { tenu, basculer, refZone } = usePriseDuCairn();
  // Déstructuré : refs et gestionnaires vont chacun où ils servent, au lieu
  // d'un objet que le React Compiler lirait en entier comme une ref.
  const { refZoneDeJeu, refSvg, refsGroupes, surDeplacement, surAppui, surSortie } =
    useChuteDesPierres(pierres, !immobile, { cadre: SANS_BORDS, tenu });

  if (immobile) return <Cairn nombre={nombre} graines={graines} className={className} />;

  return (
    <div ref={refZone} className={cn("relative h-full w-full", className)}>
      <div
        ref={refZoneDeJeu}
        /* En tactile, ce bloc ne prend le geste (`touch-none`) que prise armée :
           voir `useChuteDesPierres` et `PriseDuCairn`. Les gestionnaires
           ci-dessous ne servent qu'à la souris et au tapotement. */
        className={cn("relative h-full w-full cursor-crosshair", tenu && "touch-none")}
        onPointerMove={surDeplacement}
        onPointerDown={surAppui}
        onPointerLeave={surSortie}
        /* La fin d'un geste tactile efface le dernier point : sinon le geste
           suivant se mesurerait depuis là, avec une vitesse absurde. */
        onPointerUp={surSortie}
        onPointerCancel={surSortie}
      >
        <svg
          ref={refSvg}
          viewBox={`0 ${-hauteur + ySol} ${LARGEUR_VUE} ${hauteur}`}
          className="h-full w-full overflow-visible"
          role="img"
          aria-label={t("renversable", { nombre })}
        >
          <SolDuCairn />
          {pierres.map((pierre, rang) => (
            <g
              key={pierre.cle}
              ref={(element) => {
                refsGroupes.current[rang] = element;
              }}
              transform={`translate(${pierre.x} ${pierre.y}) rotate(${pierre.rotation})`}
            >
              <PoseDePierre
                rang={rang}
                total={pierres.length}
                derniere={rang === pierres.length - 1}
                anime={pose}
              >
                <ArêtesDePierre pierre={pierre} derniere={rang === pierres.length - 1} />
              </PoseDePierre>
            </g>
          ))}
        </svg>

        {/* Le geste part à côté des pierres : voir `BandeDePrise`. */}
        {tenu ? <BandeDePrise /> : null}
      </div>

      {/* Hors du bloc qui joue, et pas dedans : un appui sur la prise ne doit pas
          traverser jusqu'à `surAppui` et secouer une pierre au passage. */}
      <PriseDuCairn tenu={tenu} surBascule={basculer} />
    </div>
  );
}
