import Link from "next/link";
import { ROUTES } from "@/lib/auth/routes";
import { Marque } from "./marque";

/**
 * L'en-tête de l'application : la marque, et rien d'autre.
 *
 * La navigation vit dans le rail à gauche et dans la barre basse sur
 * téléphone. Cette bande ne porte donc qu'un chemin de retour, et c'est
 * pourquoi elle peut disparaître sans rien emporter.
 *
 * **Opaque, et de la même matière que ce qu'elle coiffe.** Le fond à 85 %
 * laissait passer le texte qui défile dessous — quatre pixels de flou
 * n'effacent pas des capitales à chasse fixe. Et le grain n'y était pas :
 * même teinte que le panneau sans son bruit, donc plus claire, et l'écran
 * montrait trois valeurs là où il n'y a que deux plans. C'est la couture déjà
 * corrigée sur la page publique.
 *
 * **Au rang de la coquille.** Elle vivait à `z-20`, celui d'un panneau de
 * page — et le tableau de bord lève justement le sien à `z-20`. À égalité,
 * c'est le dernier dans le balisage qui gagne : la marque passait **sous** le
 * texte. Le rail et la barre basse sont à `z-30` ; elle en est. La règle : la
 * coquille à trente, une page jamais au-dessus de vingt.
 *
 * **Elle ne sait plus quelle page est affichée, et c'est un gain.** Elle
 * lisait le chemin pour s'effacer pendant une session, ce qui en faisait un
 * composant client pour une ligne de mise en forme. C'est la scène de session
 * qui se déclare passage, et une règle de feuille de style qui retire la
 * coquille — voir `globals.css`. Elle redevient donc un composant serveur.
 */
const TAILLE_DE_LA_MARQUE = 32;

export function EnTete() {
  return (
    <header
      data-coquille="en-tete"
      className="px-pas-4 md:px-pas-8 bg-surface-papier grain sticky top-0 z-30 flex h-14 items-center justify-center md:h-16"
    >
      {/* Au-dessus du grain, qui se peint en pseudo-élément positionné et
          passerait sinon par-dessus la marque. Même rang que le contenu d'un
          panneau, pour la même raison. */}
      <Link href={ROUTES.aujourdhui} className="rounded-galet relative z-10">
        <Marque taille={TAILLE_DE_LA_MARQUE} />
      </Link>
    </header>
  );
}
