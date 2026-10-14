import Link from "next/link";
import { ROUTES } from "@/lib/auth/routes";
import { Marque } from "./marque";

/**
 * L'en-tête de l'application : la marque, et rien d'autre — la navigation vit
 * dans le rail et la barre basse, donc il peut disparaître sans rien emporter.
 *
 * Opaque et grainé comme le panneau qu'il coiffe : translucide, le texte
 * défilant se lisait au travers ; sans grain, il formait une troisième valeur.
 * `z-30`, le rang de la coquille : une page ne monte jamais au-dessus de
 * `z-20`, et à égalité le dernier dans le balisage gagne. Pendant une session,
 * c'est `app/styles/shell.css` qui le retire, ce qui le garde composant serveur.
 */
const TAILLE_DE_LA_MARQUE = 32;

export function EnTete() {
  return (
    <header
      data-coquille="en-tete"
      className="px-pas-4 md:px-pas-8 bg-surface-papier grain sticky top-0 z-30 flex h-14 items-center justify-center md:h-16"
    >
      {/* Au-dessus du grain, pseudo-élément positionné qui passerait sinon
          par-dessus la marque. */}
      <Link href={ROUTES.aujourdhui} className="rounded-galet relative z-10">
        <Marque taille={TAILLE_DE_LA_MARQUE} />
      </Link>
    </header>
  );
}
