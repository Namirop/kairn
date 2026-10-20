import { ArêtesDePierre } from "@/components/cairn/aretes-de-pierre";
import { empiler, LARGEUR_VUE } from "@/lib/domain/cairn-empilement";
import { cn } from "@/lib/fusion-des-classes";

/** Un seul dans l'application (sur `PasCeci`) : répété, il deviendrait un habillage. */

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
