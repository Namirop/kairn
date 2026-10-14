/**
 * Le nom du passage, debout dans la marge, sur toute la hauteur du contenu :
 * il dit le mode d'un coup d'œil.
 *
 * Le corps est fixe pour un mot donné et c'est l'écart entre les lettres qui
 * absorbe la hauteur, variable d'une question à l'autre : un interlettrage qui
 * change ne se voit pas, un mot qui change de taille si. Le corps se déduit de
 * la longueur du mot, pour une densité constante d'un mode à l'autre.
 */

/**
 * La hauteur, en pixels, pour laquelle l'interlettrage tombe juste — celle
 * d'un écran de question ordinaire. Pas une contrainte : `justify-between`
 * étire ou resserre autour.
 */
const HAUTEUR_VISEE_PX = 620;

/**
 * L'avance d'une lettre, en parts de corps, écart compris.
 *
 * En écriture verticale une capitale latine avance de sa largeur, soit 0,6 em en
 * Geist Mono ; le reste est l'écart qu'on veut voir entre deux lettres.
 */
const AVANCE_PAR_LETTRE = 0.95;

/** En deçà le mot n'a plus de présence, au-delà il devient l'écran. */
const CORPS_MIN_PX = 40;
const CORPS_MAX_PX = 104;

function corpsDeLaMarge(lettres: number): number {
  const vise = HAUTEUR_VISEE_PX / (AVANCE_PAR_LETTRE * Math.max(1, lettres));

  return Math.round(Math.min(CORPS_MAX_PX, Math.max(CORPS_MIN_PX, vise)));
}

export function MotDeMarge({ mot }: { mot: string }) {
  const lettres = [...mot];

  return (
    // `right-full` plutôt qu'un décalage négatif : c'est le bord droit du mot
    // qu'on veut à distance fixe, et sa largeur dépend du corps. Le seuil porte
    // sur la colonne et non sur la fenêtre, le rail changeant les marges.
    //
    // 92rem est le plancher : la colonne est bornée à 72rem, la marge vaut donc
    // 10rem de chaque côté, et « SESSION » (sept lettres, 93 px) plus ses 3rem
    // d'écart en demande 9. En dessous, le mot touche le texte.
    <p
      className="mr-pas-12 pointer-events-none absolute inset-y-0 right-full hidden justify-between font-mono leading-none text-stone-300 uppercase select-none [writing-mode:vertical-rl] @min-[92rem]:flex"
      style={{ fontSize: `${corpsDeLaMarge(lettres.length)}px` }}
    >
      {/* Lettre à lettre pour l'œil, d'un bloc pour l'oreille : épelé, le mot
          serait illisible au lecteur d'écran. L'en-tête cesse de le dire quand
          la marge le porte. */}
      <span className="sr-only">{mot}</span>

      {lettres.map((lettre, rang) => (
        <span aria-hidden key={rang}>
          {lettre}
        </span>
      ))}
    </p>
  );
}
