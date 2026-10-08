import { ArêtesDePierre } from "@/components/cairn/aretes-de-pierre";
import { empiler, LARGEUR_VUE } from "@/lib/domain/cairn-stack";
import { remplissageDePile } from "@/lib/domain/remplissage-de-pile";

/**
 * L'avancement d'une session, en pierres.
 *
 * « 2 / 9 » en petit gris disait la même chose et ne se regardait pas. Ici la
 * session se construit : une pile qu'on monte au fil des réponses. C'est le
 * meilleur endroit du produit pour ce motif, parce qu'il y **informe** au lieu
 * de décorer — même métaphore que le cairn du tableau de bord, à l'échelle
 * d'une session.
 *
 * La géométrie vient de `empiler`, comme partout ailleurs, et le remplissage de
 * `remplissageDePile` : les emplacements à venir sont les mêmes pierres, pas
 * encore posées. On voit donc à l'avance la forme de ce qu'on est en train de
 * construire — et, au-delà du plafond de la pile, la pierre en cours se comble
 * par le bas pour que chaque réponse déplace quelque chose.
 */

/**
 * La hauteur suit le nombre de pierres, pour que la pierre garde sa taille.
 *
 * À hauteur fixe, une session de douze questions donnait des pierres de quatre
 * pixels — une trace grise, pas un empilement. C'est donc la pile qui grandit
 * avec ce qu'elle a à porter, et le plafond de sept borne la hauteur.
 */
const HAUTEUR_PAR_PIERRE = 1.9;
const HAUTEUR_MINIMALE = 6;

export function PileDeSession({
  rang,
  total,
  clair = false,
  graine = "session",
  intitule,
}: {
  /** Combien de questions sont passées. La pile ne compte pas la courante. */
  rang: number;
  total: number;
  /** Sur la roche, les pierres s'inversent en gris clairs. */
  clair?: boolean;
  /** Préfixe des identifiants de découpe : deux piles sur un écran se gêneraient. */
  graine?: string;
  /**
   * Ce qu'un lecteur d'écran entend de la pile.
   *
   * Absent, elle est muette : c'est le cas quand le compte est écrit à côté
   * d'elle. L'entraînement, qui garde son compte pour lui, le passe ici — un
   * choix de motivation n'a pas à priver quelqu'un de l'information.
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
      // La pile est plus large que haute tant qu'elle compte peu de pierres :
      // sans plafond de largeur, une session d'une question posait un galet de
      // deux cents pixels. Le calage par le bas garde les pierres sur la ligne
      // du texte qui les accompagne quand la largeur contraint.
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
                {/* La découpe vit dans le repère de la pierre : elle penche donc
                    avec elle, comme un fond de cuve dans un caillou de travers.
                    Elle descend plus bas que la pierre pour couvrir la pente de
                    sa face inférieure. */}
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
