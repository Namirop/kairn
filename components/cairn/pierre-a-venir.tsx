import { useTranslations } from "next-intl";
import { SolDuCairn } from "@/components/cairn/sol-du-cairn";
import { empiler, LARGEUR_VUE } from "@/lib/domain/cairn-stack";
import { cn } from "@/lib/utils";

/**
 * L'emplacement de la première pierre : un contour, sur le sol.
 *
 * Jamais une pierre offerte pour meubler un cairn vide : le cairn ne compte que
 * les concepts retenus, et une pierre donnée ferait mentir le compteur. On
 * montre le creux, à la forme qu'`empiler` pose en premier.
 *
 * La graine est fixe : la forme désigne un emplacement, pas un concept.
 */

const GRAINE = "premiere-pierre";

/**
 * L'air réservé au-dessus de l'emplacement, en unités de vue : sans lui, la vue
 * s'arrête juste au-dessus de la pierre, et contour et sol flottent au milieu de
 * leur boîte au lieu de se poser en bas.
 */
const AIR_AU_DESSUS = 10;

export function PierreAVenir({
  className,
  clair = false,
}: {
  className?: string;
  clair?: boolean;
}) {
  const t = useTranslations("tableau.cairn");
  const { pierres, hauteur, ySol } = empiler(1, [GRAINE]);
  const pierre = pierres[0];

  if (!pierre) return null;

  return (
    <svg
      viewBox={`0 ${-hauteur + ySol - AIR_AU_DESSUS} ${LARGEUR_VUE} ${hauteur + AIR_AU_DESSUS}`}
      className={cn("h-full w-full", className)}
      role="img"
      aria-label={t("pierreAVenir")}
    >
      <SolDuCairn clair={clair} />
      <g transform={`translate(${pierre.x} ${pierre.y}) rotate(${pierre.rotation})`}>
        {/* Le tireté est la convention de l'emplacement vide ; plein, le
            contour se lirait comme une vraie pierre.

            En unités de vue (la pierre en fait ~60 de large) : tiret et vide
            égaux, à deux fois l'épaisseur du trait. Plus long, il découpe le
            bord haut en quelques traits sur la boîte de 256 px du téléphone. */}
        <path
          d={pierre.chemin}
          fill="none"
          className={clair ? "stroke-stone-500" : "stroke-stone-300"}
          strokeWidth={1.2}
          strokeLinejoin="round"
          strokeDasharray="2.5 2.5"
        />
      </g>
    </svg>
  );
}
