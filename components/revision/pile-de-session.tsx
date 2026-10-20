import { ArêtesDePierre } from "@/components/cairn/aretes-de-pierre";
import { empiler, LARGEUR_VUE } from "@/lib/domain/cairn-empilement";
import { remplissageDePile } from "@/lib/domain/remplissage-de-pile";

/**
 * L'avancement d'une session, en pierres. Les emplacements à venir sont les
 * mêmes pierres, pas encore posées ; au-delà du plafond, la pierre en cours se
 * comble par le bas, pour que chaque réponse déplace quelque chose.
 */

/** La hauteur suit le nombre de pierres, borné par `PIERRES_MAX`, pour garder leur taille. */
const HAUTEUR_PAR_PIERRE = 1.9;
const HAUTEUR_MINIMALE = 6;

export function PileDeSession({
  rang,
  total,
  clair = false,
  graine = "session",
  intitule,
}: {
  /** Questions passées, sans la courante. */
  rang: number;
  total: number;
  /** Pour la roche. */
  clair?: boolean;
  /** Préfixe des identifiants de découpe : deux piles sur un écran se gêneraient. */
  graine?: string;
  /**
   * Absent, la pile est muette (le compte est écrit à côté). L'entraînement,
   * qui n'affiche pas son compte, le donne ici au lecteur d'écran.
   */
  intitule?: string;
}) {
  const { pierres: nombre, posees, part } = remplissageDePile(rang, total);
  const { pierres, hauteur, ySol } = empiler(
    nombre,
    Array.from({ length: nombre }, (_, index) => `${graine}-${index}`),
  );

  return (
    <svg
      viewBox={`0 ${-hauteur + ySol} ${LARGEUR_VUE} ${hauteur}`}
      // Peu de pierres, la pile est plus large que haute : `max-w-52` évite le
      // galet géant, le calage par le bas la garde sur la ligne du texte.
      // i18n-ignore — une valeur d'attribut SVG, jamais lue.
      preserveAspectRatio="xMidYMax meet"
      style={{ height: `${Math.max(HAUTEUR_MINIMALE, nombre * HAUTEUR_PAR_PIERRE)}rem` }}
      className="w-auto max-w-52"
      role={intitule ? "img" : undefined}
      aria-label={intitule}
      aria-hidden={intitule ? undefined : true}
    >
      {pierres.map((pierre, index) => {
        const decoupe = `comble-${pierre.cle}`;

        if (index < posees) {
          return (
            <g
              key={pierre.cle}
              transform={`translate(${pierre.x} ${pierre.y}) rotate(${pierre.rotation})`}
            >
              <ArêtesDePierre pierre={pierre} derniere={index === posees - 1} clair={clair} />
            </g>
          );
        }

        return (
          <g
            key={pierre.cle}
            transform={`translate(${pierre.x} ${pierre.y}) rotate(${pierre.rotation})`}
          >
            <ArêtesDePierre pierre={pierre} derniere={false} clair={clair} aVenir />

            {index === posees && part > 0 ? (
              <>
                {/* Dans le repère de la pierre, elle penche avec elle et
                    descend sous sa face inférieure pour en couvrir la pente. */}
                <clipPath id={decoupe}>
                  <rect
                    x={-pierre.largeur}
                    y={pierre.hauteur / 2 - part * pierre.hauteur}
                    width={pierre.largeur * 2}
                    height={part * pierre.hauteur + pierre.hauteur * 0.25}
                  />
                </clipPath>
                <g clipPath={`url(#${decoupe})`}>
                  <ArêtesDePierre pierre={pierre} derniere={false} clair={clair} />
                </g>
              </>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}
