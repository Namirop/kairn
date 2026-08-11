import { PileEnConstruction } from "@/components/cairn/pile-en-construction";
import { Panneau } from "@/components/coquille/panneau";

/**
 * L'attente entre deux écrans de l'application.
 *
 * Une seule phrase et un empilement en cours : rien à lire, rien à compter. Un
 * squelette gris qui mime la page suivante promettrait une mise en page qu'on
 * ne connaît pas encore — celle de la révision n'a rien à voir avec celle des
 * dépôts.
 */
export default function Chargement() {
  return (
    <Panneau surface="papier" className="md:py-pas-16">
      <div className="gap-pas-4 flex items-center">
        <PileEnConstruction />
        <p className="text-petit text-stone-500">Un instant.</p>
      </div>
    </Panneau>
  );
}
