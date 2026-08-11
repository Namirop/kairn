import { ArêtesDePierre } from "@/components/cairn/aretes-de-pierre";
import { empiler, LARGEUR_VUE } from "@/lib/domain/cairn-stack";
import { cn } from "@/lib/utils";

/**
 * Une pierre posée au sol, seule.
 *
 * C'est l'empilement à un : la géométrie vient de `empiler`, comme le cairn du
 * tableau de bord et le compteur de session. Aucune forme de pierre n'est
 * redessinée ailleurs dans le produit — le jour où le logo arrivera, tout
 * dérivera de la même source.
 *
 * Elle sert les états vides : ce n'est pas une icône, c'est le premier état de
 * l'empilement. Rien n'est encore construit, mais la première pierre est là.
 */
export function PierreSeule({ graine, className }: { graine?: string; className?: string }) {
  const { pierres, hauteur, ySol } = empiler(1, graine ? [graine] : undefined);
  const pierre = pierres[0];

  if (!pierre) return null;

  return (
    <svg
      viewBox={`0 ${-hauteur + ySol} ${LARGEUR_VUE} ${hauteur}`}
      className={cn("h-auto", className)}
      aria-hidden
    >
      <line
        x1={LARGEUR_VUE * 0.18}
        y1={0}
        x2={LARGEUR_VUE * 0.82}
        y2={0}
        className="stroke-stone-300"
        strokeWidth={1.5}
      />
      <g transform={`translate(${pierre.x} ${pierre.y}) rotate(${pierre.rotation})`}>
        <ArêtesDePierre pierre={pierre} derniere={false} />
      </g>
    </svg>
  );
}
