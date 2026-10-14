import { COTE_DU_POINT, pierreDuPoint } from "@/lib/design/marque";

/**
 * « Kairn » composé, avec ou sans la pierre sur le i.
 *
 * Le i est un i sans point (U+0131) et la pierre prend la place du point : un
 * point recouvert dépasserait d'un cheveu autour d'une pierre irrégulière. Le
 * glyphe existe dans le sous-ensemble latin de Bricolage Grotesque, donc il ne
 * tombe pas sur une police de repli.
 */

/**
 * Sous ce corps, la pierre du i n'est plus qu'une tache de quelques pixels, et le
 * mot reste nu. En pixels, parce que c'est une limite de perception et pas une
 * proportion.
 */
export const CORPS_MINIMAL_DE_LA_PIERRE = 40;

/**
 * La place optique du point, en parts de corps, relevée sur Bricolage
 * Grotesque : un peu au-dessus de la hauteur d'x, et de la largeur du fût.
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
        Correction optique : « Kairn » n'a aucun jambage descendant, donc tout
        ce qui centre sa boîte centre aussi le vide du bas, et le mot paraît
        monter. Le décalage vaut l'écart mesuré entre le milieu de l'encre et
        celui de la boîte, en `em` pour suivre le corps.
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
