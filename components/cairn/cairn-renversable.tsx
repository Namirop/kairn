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
 * Le cairn de la page publique, qu'un geste fait tomber. Réservé au marketing :
 * sur le tableau de bord, chaque pierre est un concept consolidé.
 *
 * La physique déplace le `<g>` extérieur, `PoseDePierre` n'anime que son
 * contenu : pose et chute ne se gênent pas. Au doigt, voir `PriseDuCairn`.
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
  // Déstructuré : le React Compiler lirait l'objet entier comme une ref.
  const { refZoneDeJeu, refSvg, refsGroupes, surDeplacement, surAppui, surSortie } =
    useChuteDesPierres(pierres, !immobile, { cadre: SANS_BORDS, tenu });

  if (immobile) return <Cairn nombre={nombre} graines={graines} className={className} />;

  return (
    <div ref={refZone} className={cn("relative h-full w-full", className)}>
      <div
        ref={refZoneDeJeu}
        /* En tactile, `touch-none` seulement prise armée ; ces gestionnaires ne
           servent qu'à la souris et au tapotement. */
        className={cn("relative h-full w-full cursor-crosshair", tenu && "touch-none")}
        onPointerMove={surDeplacement}
        onPointerDown={surAppui}
        onPointerLeave={surSortie}
        /* Sinon le geste suivant se mesurerait depuis ce point, à une vitesse absurde. */
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

        {tenu ? <BandeDePrise /> : null}
      </div>

      {/* Hors du bloc qui joue : un appui sur la prise ne doit pas atteindre
          `surAppui` et secouer une pierre. */}
      <PriseDuCairn tenu={tenu} surBascule={basculer} />
    </div>
  );
}
