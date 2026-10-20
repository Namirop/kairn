import { empiler, LARGEUR_VUE } from "@/lib/domain/cairn-empilement";

/**
 * Un cairn du paysage, tiré d'une graine : `SilhouetteDeCairn` tire toujours
 * les mêmes pierres et ferait du paysage un motif répété.
 */
export function CairnDuPaysage({
  graine,
  pierres,
  teintes,
  sommet,
}: {
  graine: string;
  pierres: number;
  teintes: [string, string, string];
  /** La variable qui peint la pierre du sommet, par plan. */
  sommet: string;
}) {
  const empilement = empiler(
    pierres,
    Array.from({ length: pierres }, (_, index) => `${graine}-${index}`),
  );

  return (
    <svg
      viewBox={`0 ${-empilement.hauteur + empilement.ySol} ${LARGEUR_VUE} ${empilement.hauteur}`}
      className="h-full w-auto"
      aria-hidden
    >
      {empilement.pierres.map((pierre, rang) => (
        <g
          key={pierre.cle}
          transform={`translate(${pierre.x} ${pierre.y}) rotate(${pierre.rotation})`}
        >
          {/* Le sommet prend la variable du plan si elle est définie (le
              lichen, au plan proche), sinon la teinte de l'empilement. */}
          <path
            d={pierre.chemin}
            fill={
              rang === empilement.pierres.length - 1
                ? `var(${sommet}, ${teintes[pierre.nuance]})`
                : teintes[pierre.nuance]
            }
          />
        </g>
      ))}
    </svg>
  );
}
