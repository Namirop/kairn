import { HAUTEUR_STRATES, LARGEUR_STRATES, strates } from "@/lib/domain/strates";
import { SURFACES, variableDe, type Surface } from "./surfaces";

/**
 * La jointure entre deux panneaux : une coupe de roche.
 *
 * Elle occupe toute la largeur et s'étire — `preserveAspectRatio="none"` — donc
 * la coupe est plus tendue sur un grand écran et plus resserrée sur un
 * téléphone, comme une strate qu'on regarde de plus ou moins loin.
 *
 * Les deux veines se calculent par `color-mix` vers le gris de lichen : aucune
 * couleur n'est inventée ici, elles dérivent toutes des tokens existants. Elles
 * ne se contentent pas d'interpoler entre les deux surfaces — entre le papier
 * et l'ombre, l'écart est si faible qu'un dégradé en trois pas ne se voyait
 * pas. Une strate porte sa propre valeur, plus minérale que les deux panneaux
 * qu'elle sépare, et c'est ce qui la fait lire comme une coupe.
 */
export function Strates({ de, vers, graine }: { de: Surface; vers: Surface; graine: string }) {
  const { coupe, veines } = strates(graine);
  const veine = (surface: Surface, part: number) =>
    `color-mix(in oklab, ${variableDe(surface)} ${part}%, var(--stone-500))`;

  return (
    <div aria-hidden className={`relative h-8 w-full md:h-14 ${SURFACES[de].fond}`}>
      <svg
        viewBox={`0 0 ${LARGEUR_STRATES} ${HAUTEUR_STRATES}`}
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full"
      >
        <path d={veines[0]} fill={veine(de, 78)} />
        <path d={veines[1]} fill={veine(vers, 62)} />
        <path d={coupe} fill={variableDe(vers)} />
      </svg>
    </div>
  );
}
