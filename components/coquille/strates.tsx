import { HAUTEUR_STRATES, LARGEUR_STRATES, strates } from "@/lib/domain/strates";
import { SURFACES, variableDe, type Surface } from "./surfaces";

/**
 * La jointure entre deux panneaux : une coupe de roche.
 *
 * Elle occupe toute la largeur et s'étire — `preserveAspectRatio="none"` — donc
 * la coupe est plus tendue sur un grand écran et plus resserrée sur un
 * téléphone, comme une strate qu'on regarde de plus ou moins loin.
 *
 * Les deux veines intermédiaires se calculent par `color-mix` entre les deux
 * surfaces : aucune couleur n'est inventée ici, elles sont toutes dérivées des
 * quatre tokens. Le jour où une surface change, la jointure suit sans qu'on y
 * touche.
 */
export function Strates({ de, vers, graine }: { de: Surface; vers: Surface; graine: string }) {
  const { coupe, veines } = strates(graine);
  const melange = (part: number) =>
    `color-mix(in oklab, ${variableDe(de)} ${part}%, ${variableDe(vers)})`;

  return (
    <div aria-hidden className={`relative h-6 w-full md:h-10 ${SURFACES[de].fond}`}>
      <svg
        viewBox={`0 0 ${LARGEUR_STRATES} ${HAUTEUR_STRATES}`}
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full"
      >
        <path d={veines[0]} fill={melange(66)} />
        <path d={veines[1]} fill={melange(33)} />
        <path d={coupe} fill={variableDe(vers)} />
      </svg>
    </div>
  );
}
