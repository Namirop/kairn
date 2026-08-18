import { SolDuCairn } from "@/components/cairn/sol-du-cairn";
import { empiler, LARGEUR_VUE } from "@/lib/domain/cairn-stack";
import { cn } from "@/lib/utils";

/**
 * L'emplacement de la première pierre : un contour, sur le sol.
 *
 * Un cairn vide ne rendait qu'un trait perdu au milieu du plus grand panneau de
 * l'application. Le réflexe serait d'offrir une pierre ou deux pour meubler,
 * mais le cairn compte les concepts consolidés et rien d'autre : une pierre
 * donnée ferait mentir le compteur qui l'accompagne, et surtout elle volerait à
 * la première vraie pierre le seul moment où elle a du sens. Une progression ne
 * récompense que si elle est vraie.
 *
 * On montre donc le creux plutôt que la pierre. La forme est celle qu'`empiler`
 * pose en premier, dessinée en contour et sans remplissage : la place existe,
 * elle est vide, et on voit exactement ce qui viendra s'y poser. C'est une
 * invitation, pas une décoration — et ça ne prétend rien.
 *
 * La graine est fixe : cette forme-là désigne un emplacement, pas un concept.
 * Celles des vraies pierres viennent des identifiants d'Atom.
 */

const GRAINE = "premiere-pierre";

/**
 * L'air réservé au-dessus de l'emplacement, en unités de vue.
 *
 * Sans lui, la vue s'arrête six unités au-dessus de la pierre à venir : le
 * contour et son sol se posaient alors au milieu de leur boîte, à la hauteur où
 * un empilement de douze aurait eu son sommet. Un cairn ne commence pas en
 * l'air. La place se marque en bas, et ce qui est réservé au-dessus est
 * exactement ce dans quoi l'empilement montera.
 */
const AIR_AU_DESSUS = 10;

export function PierreAVenir({
  className,
  clair = false,
}: {
  className?: string;
  clair?: boolean;
}) {
  const { pierres, hauteur, ySol } = empiler(1, [GRAINE]);
  const pierre = pierres[0];

  if (!pierre) return null;

  return (
    <svg
      viewBox={`0 ${-hauteur + ySol - AIR_AU_DESSUS} ${LARGEUR_VUE} ${hauteur + AIR_AU_DESSUS}`}
      className={cn("h-full w-full", className)}
      role="img"
      aria-label="Aucune pierre posée. La place de la première est marquée."
    >
      <SolDuCairn clair={clair} />
      <g transform={`translate(${pierre.x} ${pierre.y}) rotate(${pierre.rotation})`}>
        <path
          d={pierre.chemin}
          fill="none"
          className={clair ? "stroke-stone-500" : "stroke-stone-300"}
          strokeWidth={1.2}
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
}
