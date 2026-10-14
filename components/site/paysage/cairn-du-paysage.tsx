import { empiler, LARGEUR_VUE } from "@/lib/domain/cairn-stack";

/**
 * Un cairn du paysage.
 *
 * `SilhouetteDeCairn` tire toujours les mêmes neuf pierres : posée treize fois
 * elle donnerait treize fois le même dessin, c'est-à-dire un motif répété — la
 * seule chose que ce composant-là s'interdit. Celui-ci prend sa graine, donc
 * aucun cairn du paysage n'est le même que son voisin.
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
          {/* La dernière pierre est celle du sommet. Elle peut porter le lichen
              comme le grand cairn — `--sommet-paysage` est vide par défaut, donc
              elle reste de la couleur de son empilement. */}
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
