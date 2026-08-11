import { ArêtesDePierre } from "@/components/cairn/aretes-de-pierre";
import { empiler, LARGEUR_VUE } from "@/lib/domain/cairn-stack";
import { cn } from "@/lib/utils";

/**
 * Un cairn en très faible opacité, comme texture de fond.
 *
 * **Un seul dans toute l'application.** C'est de la matière, pas un motif à
 * répéter : dès qu'il apparaît deux fois, il cesse d'être une texture et
 * devient un habillage. Il vit sur le panneau qui affirme ce que le produit
 * n'est pas — le seul endroit où le fond a le droit d'être occupé sans rien
 * dire.
 *
 * La géométrie vient de `empiler`, comme partout : aucune pierre n'est
 * redessinée ailleurs.
 */

const PIERRES = 9;

export function SilhouetteDeCairn({ className }: { className?: string }) {
  const { pierres, hauteur, ySol } = empiler(
    PIERRES,
    Array.from({ length: PIERRES }, (_, index) => `silhouette-${index}`),
  );

  return (
    <svg
      viewBox={`0 ${-hauteur + ySol} ${LARGEUR_VUE} ${hauteur}`}
      className={cn("h-full w-auto opacity-[0.055]", className)}
      aria-hidden
    >
      {pierres.map((pierre) => (
        <g
          key={pierre.cle}
          transform={`translate(${pierre.x} ${pierre.y}) rotate(${pierre.rotation})`}
        >
          <ArêtesDePierre pierre={pierre} derniere={false} clair />
        </g>
      ))}
    </svg>
  );
}
