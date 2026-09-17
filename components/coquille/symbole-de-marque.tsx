import { cadreDuSymbole, empilementDuLogo, nuanceDuRang } from "@/lib/design/marque";

/**
 * L'empilement du logo.
 *
 * Il appelle la même fonction que le cairn du tableau de bord, et en dispose
 * autrement sur deux points seulement.
 *
 * **La nuance est imposée par le rang, pas tirée.** Le cairn du tableau de bord
 * garde le tirage — c'est ce qui rend chaque empilement personnel. Un logo demande
 * l'inverse : une dégradation franche, la plus sombre en bas.
 *
 * **Le sommet est une pierre entièrement glacier.** Dans `Cairn`, seule son arête
 * l'est ; à seize pixels, une arête d'un pixel et demi disparaît. C'est le seul
 * point de couleur de toute l'identité, et il s'inverse avec les pierres : le
 * glacier vif sur la roche, où il porte 6,94 contre 1, le glacier profond sur le
 * clair, où il porte 5,49. Le vif y tomberait à 1,76, sous les trois pour un
 * exigés d'un objet graphique — une identité illisible n'est plus une identité.
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
                ? clair
                  ? "fill-glacier"
                  : "fill-glacier-profond"
                : teintes[nuanceDuRang(rang, empilement.pierres.length)]
            }
          />
        </g>
      ))}
    </svg>
  );
}
