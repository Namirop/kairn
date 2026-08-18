import { COTE_DU_POINT, pierreDuPoint } from "@/lib/design/marque";

/**
 * « Kairn » composé, avec ou sans la pierre sur le i.
 *
 * Le mot se compose en display et en nom propre : une capitale, le reste en bas
 * de casse. Pas dans une grotesque générique — c'est ce qui fait ressembler un
 * logotype à une enseigne de banque.
 *
 * **Le i est un i sans point**, U+0131, et la pierre prend la place que le point
 * occupait. Ce n'est pas un point recouvert : superposer laisserait le point
 * dépasser d'un cheveu tout autour, ce qui se voit d'autant plus que la pierre est
 * irrégulière. Le glyphe existe dans le sous-ensemble latin de Bricolage
 * Grotesque, donc il ne tombe pas sur une police de repli.
 *
 * La pierre est **taillée**, pas dessinée : même fonction que les cinq de
 * l'empilement. Un rectangle arrondi à cette place jurerait avec elles — c'est
 * l'irrégularité des flancs et des coins qui fait lire « pierre » plutôt que
 * « puce ».
 *
 * Elle est posée en `em`, donc elle suit le corps sans jamais se dérégler. Mais
 * elle **disparaît sous un certain corps** : à dix-huit pixels elle en ferait
 * trois, et trois pixels de vert ne sont plus une pierre, c'est une salissure. Le
 * mot reste alors nu, ce qui est un logotype parfaitement valide.
 */

/**
 * Sous ce corps, la pierre du i devient une tache. En pixels, parce que c'est une
 * limite de perception et pas une proportion : le seuil ne change pas avec le
 * corps, il le borne.
 */
export const CORPS_MINIMAL_DE_LA_PIERRE = 40;

/**
 * La place optique du point, en parts de corps.
 *
 * Relevées sur Bricolage Grotesque : le point d'un i sied un peu au-dessus de la
 * hauteur d'x, et sa largeur suit celle du fût. La pierre reprend ces deux
 * mesures et rien d'autre — ni plus haute, ni décalée, ni plus lourde.
 */
const LARGEUR_EM = 0.14;
const BASE_EM = 0.63;

function PierreDuPoint() {
  const cote = COTE_DU_POINT;

  return (
    <span
      aria-hidden
      className="absolute left-1/2 -translate-x-1/2"
      style={{ width: `${LARGEUR_EM}em`, bottom: `${BASE_EM}em` }}
    >
      <svg viewBox={`${-cote / 2} ${-cote / 2} ${cote} ${cote}`} className="block h-auto w-full">
        <path d={pierreDuPoint()} className="fill-lichen" />
      </svg>
    </span>
  );
}

export function MotDeMarque({
  taille,
  clair = false,
  avecPierre = false,
}: {
  /** Le corps du mot, en pixels. Un logotype ne change pas de taille au md. */
  taille: number;
  clair?: boolean;
  /** Réservé au mot seul : dans le verrouillage, le symbole le dit déjà. */
  avecPierre?: boolean;
}) {
  const pierre = avecPierre && taille >= CORPS_MINIMAL_DE_LA_PIERRE;

  return (
    <span
      /*
        La correction optique du mot.

        « Kairn » n'a aucun jambage descendant : à interligne nul, son encre
        occupe le haut de sa boîte et laisse vide le quart du bas, celui que le
        jambage aurait pris. Tout ce qui centre cette boîte — le verrouillage
        avec son symbole, l'en-tête avec son lien — centre donc du vide autant
        que des lettres, et le mot monte de deux ou trois pixels. Ça ne se nomme
        pas au premier regard, ça se voit au second.

        Le décalage vaut l'écart mesuré entre le milieu de l'encre et le milieu
        de la boîte, et il est en `em` : il suit le corps sans jamais se
        dérégler, du logotype d'un en-tête à celui d'une page légale.
      */
      className={`font-display translate-y-[0.06em] leading-none font-semibold tracking-[-0.02em] ${
        clair ? "text-stone-50" : "text-stone-900"
      }`}
      style={{ fontSize: `${taille}px` }}
    >
      Ka
      {pierre ? (
        <span className="relative inline-block">
          {"ı"}
          <PierreDuPoint />
        </span>
      ) : (
        "i"
      )}
      rn
    </span>
  );
}
