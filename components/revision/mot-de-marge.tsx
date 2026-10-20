/**
 * Le nom du mode, debout dans la marge sur toute la hauteur du contenu. Le corps
 * dépend de la longueur du mot ; l'interlettrage absorbe la hauteur, variable
 * d'une question à l'autre : il change sans se voir, une taille changerait à vue.
 */

/** Un écran de question ordinaire ; `justify-between` étire ou resserre autour. */
const HAUTEUR_VISEE_PX = 620;

/** En parts de corps : 0,6 de capitale Geist Mono en vertical, le reste d'écart. */
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
    // `right-full` : la largeur dépend du corps, c'est le bord droit qu'on veut
    // à distance fixe. Seuil sur la colonne, pas la fenêtre (le rail change les
    // marges). 92rem = colonne de 72rem + 10rem de marge par côté ; « SESSION »
    // (93 px) et ses 3rem d'écart en demandent 9. En dessous, il touche le texte.
    <p
      className="mr-pas-12 pointer-events-none absolute inset-y-0 right-full hidden justify-between font-mono leading-none text-stone-300 uppercase select-none [writing-mode:vertical-rl] @min-[92rem]:flex"
      style={{ fontSize: `${corpsDeLaMarge(lettres.length)}px` }}
    >
      {/* D'un bloc pour le lecteur d'écran, qui épellerait sinon. L'en-tête se
          tait quand la marge le porte. */}
      <span className="sr-only">{mot}</span>

      {lettres.map((lettre, rang) => (
        <span aria-hidden key={rang}>
          {lettre}
        </span>
      ))}
    </p>
  );
}
