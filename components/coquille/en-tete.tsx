import Link from "next/link";
import { ROUTES } from "@/lib/auth/routes";
import { Marque } from "./marque";

/**
 * La marque seule : la navigation est ailleurs, il peut disparaître sans rien
 * emporter. Opaque et grainé : translucide, le texte défilant se lit au travers ;
 * sans grain, il fait une troisième valeur. `z-30` : une page ne dépasse jamais
 * `z-20`, et à égalité le dernier balisé gagne. En session, `coquille.css` le
 * retire, ce qui le garde composant serveur.
 */
const TAILLE_DE_LA_MARQUE = 32;

export function EnTete() {
  return (
    <header
      data-coquille="en-tete"
      className="px-pas-4 md:px-pas-8 bg-surface-papier grain sticky top-0 z-30 flex h-14 items-center justify-center md:h-16"
    >
      {/* Le grain est un pseudo-élément positionné : il passerait par-dessus. */}
      <Link href={ROUTES.aujourdhui} className="rounded-galet relative z-10">
        <Marque taille={TAILLE_DE_LA_MARQUE} />
      </Link>
    </header>
  );
}
