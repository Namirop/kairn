import { COTE_DU_POINT, pierreDuPoint } from "@/lib/design/marque";

/**
 * Un i sans point (U+0131) sous la pierre : un point recouvert dépasserait d'un
 * cheveu. Le glyphe est dans le sous-ensemble latin de Bricolage Grotesque.
 */

/** En pixels : limite de perception, pas proportion. En dessous, la pierre est une tache. */
export const CORPS_MINIMAL_DE_LA_PIERRE = 40;

/** Relevé sur Bricolage Grotesque, en parts de corps : largeur du fût, au-dessus de l'x. */
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
  /** En pixels : un logotype ne change pas de taille au md. */
  taille: number;
  clair?: boolean;
  /** Réservé au mot seul : dans le verrouillage, le symbole le dit déjà. */
  avecPierre?: boolean;
}) {
  const pierre = avecPierre && taille >= CORPS_MINIMAL_DE_LA_PIERRE;

  return (
    <span
      // Sans jambage, le mot centré paraît monter : 0,06em est l'écart mesuré
      // entre le milieu de l'encre et celui de la boîte.
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
