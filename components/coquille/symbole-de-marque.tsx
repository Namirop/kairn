import { cadreDuSymbole, empilementDuLogo, nuanceDuRang } from "@/lib/design/marque";

/**
 * Contrairement au cairn du tableau de bord : nuance imposée par le rang (un logo
 * veut une dégradation franche) et sommet tout lichen, car à 16 px une arête
 * disparaît. Le lichen ne s'inverse pas : ~7:1 sur la roche, au-dessus des 3:1.
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
  /** Hauteur, en pixels. */
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
