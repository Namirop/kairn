/**
 * Le nom du passage, debout dans la marge, sur toute la hauteur du contenu.
 *
 * Ce n'est pas une étiquette : c'est ce qui dit, d'un coup d'œil et sans se lire,
 * dans quel mode on est. Les marges d'un écran large sont vides ; un mot posé
 * dedans les occupe mieux qu'un libellé de douze pixels en tête de colonne.
 *
 * **Les lettres sont distribuées, pas espacées.** Le mot va du haut de l'en-tête
 * au bas de la dernière action, et cette hauteur change d'une question à l'autre —
 * un QCM à quatre options est plus long qu'un texte à trou. Si le corps s'ajustait
 * à la hauteur, la typo grandirait et rétrécirait à chaque question, ce qui se
 * verrait immédiatement. Le corps est donc **fixe**, et c'est le blanc entre les
 * lettres qui respire : on ne remarque pas qu'un interlettrage a gagné trois
 * pixels, on remarque tout de suite qu'un mot a changé de taille.
 *
 * Ce corps se déduit de la longueur du mot, et de rien d'autre. « SESSION » et
 * « ENTRAÎNEMENT » n'ont pas le même nombre de lettres ; au même corps, l'un
 * remplirait la colonne et l'autre s'arrêterait au tiers. Un mot de sept lettres
 * est donc dessiné plus grand — c'est la densité qui est constante d'un mode à
 * l'autre, pas la mesure du glyphe.
 */

/**
 * La hauteur que le mot vise, en pixels.
 *
 * Elle n'est pas une contrainte : `justify-between` étire ou resserre l'écart des
 * lettres autour d'elle. C'est la hauteur pour laquelle l'interlettrage tombe
 * juste — celle d'un écran de question ordinaire.
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
    // qu'on veut à distance fixe de la colonne, et sa largeur dépend du corps.
    // Le seuil porte sur la colonne et non sur la fenêtre — avec le rail à
    // droite, la même fenêtre laisse deux marges très différentes.
    <p
      className="mr-pas-12 pointer-events-none absolute inset-y-0 right-full hidden justify-between font-mono leading-none text-stone-300 uppercase select-none [writing-mode:vertical-rl] @min-[96rem]:flex"
      style={{ fontSize: `${corpsDeLaMarge(lettres.length)}px` }}
    >
      {/* Lettre à lettre pour l'œil, d'un bloc pour l'oreille : épelé, le mot
          serait illisible à qui l'écoute. L'en-tête cesse de le dire dès que la
          marge le porte, et le reprend dès qu'elle ne le porte plus. */}
      <span className="sr-only">{mot}</span>

      {lettres.map((lettre, rang) => (
        <span aria-hidden key={rang}>
          {lettre}
        </span>
      ))}
    </p>
  );
}
