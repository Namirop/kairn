import { ArêtesDePierre } from "@/components/cairn/aretes-de-pierre";
import { empiler, LARGEUR_VUE } from "@/lib/domain/cairn-stack";

/**
 * L'avancement d'une session, en pierres.
 *
 * « 2 / 9 » en petit gris disait la même chose et ne se regardait pas. Ici la
 * session se construit : une pile qu'on monte au fil des réponses. C'est le
 * meilleur endroit du produit pour ce motif, parce qu'il y **informe** au lieu
 * de décorer — même métaphore que le cairn du tableau de bord, à l'échelle
 * d'une session.
 *
 * La géométrie vient de `empiler`, comme partout ailleurs : les emplacements à
 * venir sont les mêmes pierres, simplement pas encore posées. On voit donc à
 * l'avance la forme de ce qu'on est en train de construire.
 */

/**
 * Le plafond de la pile, et le vrai sujet de ce fichier.
 *
 * Une pierre par question tenait à six questions et s'effondrait à vingt : une
 * tour plantée dans le coin d'une carte de lecture, faite de vingt traits gris
 * de quatre pixels. Au-delà du plafond, une pierre ne vaut donc plus une
 * question mais une part du chemin — la pile garde sa taille, et c'est le
 * remplissage qui porte l'information. Sous le plafond, la part vaut exactement
 * une question : les deux régimes n'en font qu'un, sans cas particulier.
 */
const PIERRES_MAX = 7;

/**
 * La hauteur suit le nombre de pierres, pour que la pierre garde sa taille.
 *
 * À hauteur fixe, une session de douze questions donnait des pierres de quatre
 * pixels — une trace grise, pas un empilement.
 */
const HAUTEUR_PAR_PIERRE = 0.85;
const HAUTEUR_MINIMALE = 3;

export function PileDeSession({
  rang,
  total,
  chiffree = true,
}: {
  rang: number;
  total: number;
  /** Le compte exact à côté de la pile. L'entraînement ne le porte pas. */
  chiffree?: boolean;
}) {
  const questions = Math.max(total, 1);
  const hauteurPile = Math.min(questions, PIERRES_MAX);
  const posees = Math.min(Math.round((rang / questions) * hauteurPile), hauteurPile);
  const { pierres, hauteur, ySol } = empiler(
    hauteurPile,
    Array.from({ length: hauteurPile }, (_, index) => `session-${index}`),
  );

  return (
    <div className="gap-pas-3 flex items-end">
      <svg
        viewBox={`0 ${-hauteur + ySol} ${LARGEUR_VUE} ${hauteur}`}
        // La pile est plus large que haute tant qu'elle compte peu de pierres :
        // sans plafond de largeur, une session d'une question posait un galet
        // de deux cents pixels en haut de la carte. Le calage par le bas garde
        // les pierres sur la ligne du reste de l'en-tête quand la largeur
        // contraint et laisse du mou en hauteur.
        preserveAspectRatio="xMidYMax meet"
        style={{
          height: `${Math.max(HAUTEUR_MINIMALE, hauteurPile * HAUTEUR_PAR_PIERRE)}rem`,
        }}
        className="w-auto max-w-20"
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

      {chiffree ? (
        <p className="text-mono pb-pas-1 font-mono text-stone-500 tabular-nums">
          {rang + 1} / {total}
        </p>
      ) : null}
    </div>
  );
}
