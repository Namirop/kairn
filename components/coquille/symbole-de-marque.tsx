import { cadreDuSymbole, empilementDuLogo, nuanceDuRang } from "@/lib/design/marque";

/**
 * L'empilement du logo. Il diffère du cairn du tableau de bord sur deux points.
 *
 * La nuance est imposée par le rang, pas tirée : un logo demande une
 * dégradation franche, la plus sombre en bas.
 *
 * Le sommet est une pierre entièrement lichen, et non une arête : à 16 px, une
 * arête d'un pixel et demi disparaît. Il ne s'inverse pas sur fond sombre ; sur
 * la roche, il porte environ 7 contre 1, au-dessus des 3 exigés d'un objet
 * graphique.
 */

const NUANCES = ["fill-stone-900", "fill-stone-800", "fill-stone-700"] as const;
const NUANCES_CLAIRES = ["fill-stone-50", "fill-stone-100", "fill-stone-300"] as const;

export function SymboleDeMarque({
  pierres,
  taille,
  clair = false,
  className,
}: {
  pierres: number;
  /** La hauteur rendue, en pixels. */
  taille: number;
  clair?: boolean;
  className?: string;
}) {
  const empilement = empilementDuLogo(pierres);
  const vue = cadreDuSymbole(pierres);
  const teintes = clair ? NUANCES_CLAIRES : NUANCES;

  return (
    <svg
      viewBox={`${vue.x} ${vue.y} ${vue.largeur} ${vue.hauteur}`}
      height={taille}
      width={(taille * vue.largeur) / vue.hauteur}
      className={className}
      aria-hidden
    >
      {empilement.pierres.map((pierre, rang) => (
        <g
          key={pierre.cle}
          transform={`translate(${pierre.x} ${pierre.y}) rotate(${pierre.rotation})`}
        >
          <path
            d={pierre.chemin}
            className={
              rang === empilement.pierres.length - 1
                ? "fill-lichen"
                : teintes[nuanceDuRang(rang, empilement.pierres.length)]
            }
          />
        </g>
      ))}
    </svg>
  );
}
