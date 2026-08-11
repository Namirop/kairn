import { ArêtesDePierre } from "@/components/cairn/aretes-de-pierre";
import { empiler, LARGEUR_VUE } from "@/lib/domain/cairn-stack";

/**
 * L'avancement d'une session, en pierres.
 *
 * « 2 / 9 » en petit gris disait la même chose et ne se regardait pas. Ici la
 * session se construit : autant d'emplacements que de questions, une pierre
 * posée à chaque réponse. C'est le meilleur endroit du produit pour ce motif,
 * parce qu'il y **informe** au lieu de décorer — même métaphore que le cairn du
 * tableau de bord, à l'échelle d'une session.
 *
 * La géométrie vient de `empiler`, comme partout ailleurs : les emplacements à
 * venir sont les mêmes pierres, simplement pas encore posées. On voit donc à
 * l'avance la forme de ce qu'on est en train de construire.
 */

/** Au-delà, les pierres deviennent des traits : on retombe sur un compteur. */
const PIERRES_MAX = 20;

/**
 * La hauteur suit le nombre de questions, pour que la pierre garde sa taille.
 *
 * À hauteur fixe, une session de douze questions donnait des pierres de quatre
 * pixels — une trace grise, pas un empilement. Chaque pierre vaut donc une
 * hauteur, et c'est la pile qui grandit.
 */
const HAUTEUR_PAR_PIERRE = 0.62;
const HAUTEUR_MINIMALE = 3.2;

export function PileDeSession({ rang, total }: { rang: number; total: number }) {
  const hauteurPile = Math.min(Math.max(total, 1), PIERRES_MAX);
  const posees = Math.min(rang, hauteurPile);
  const { pierres, hauteur, ySol } = empiler(
    hauteurPile,
    Array.from({ length: hauteurPile }, (_, index) => `session-${index}`),
  );

  return (
    <div className="gap-pas-3 flex items-end">
      <svg
        viewBox={`0 ${-hauteur + ySol} ${LARGEUR_VUE} ${hauteur}`}
        style={{
          height: `${Math.max(HAUTEUR_MINIMALE, hauteurPile * HAUTEUR_PAR_PIERRE)}rem`,
        }}
        className="w-auto"
        role="img"
        aria-label={`Question ${rang + 1} sur ${total}`}
      >
        {pierres.map((pierre, index) => (
          <g
            key={pierre.cle}
            transform={`translate(${pierre.x} ${pierre.y}) rotate(${pierre.rotation})`}
            // Les emplacements à venir sont dessinés en creux : la pile entière
            // est visible dès la première question, ce qui dit où on va.
            className={index < posees ? "opacity-100" : "opacity-15"}
          >
            <ArêtesDePierre pierre={pierre} derniere={index === posees - 1} />
          </g>
        ))}
      </svg>

      <p className="text-mono pb-pas-1 font-mono text-stone-500 tabular-nums">
        {rang + 1} / {total}
      </p>
    </div>
  );
}
