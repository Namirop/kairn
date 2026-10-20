import { useTranslations } from "next-intl";
import { SolDuCairn } from "@/components/cairn/sol-du-cairn";
import { empiler, LARGEUR_VUE } from "@/lib/domain/cairn-empilement";
import { cn } from "@/lib/fusion-des-classes";

/**
 * Un contour, jamais une pierre offerte : le cairn ne compte que les concepts
 * retenus, une pierre donnée ferait mentir le compteur.
 */

/** Fixe : la forme désigne un emplacement, pas un concept. */
const GRAINE = "premiere-pierre";

/** En unités de vue. Sans cet air, contour et sol flottent au milieu de leur boîte. */
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
        {/* Tireté : plein, il se lirait comme une vraie pierre. Tiret et vide à
            deux épaisseurs de trait ; plus long, il hache le bord haut dans la
            boîte de 256 px du téléphone. */}
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
