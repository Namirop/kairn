import { PileEnConstruction } from "@/components/cairn/pile-en-construction";
import { Panneau } from "@/components/coquille/panneau";
import { PileDePanneaux } from "@/components/coquille/pile-de-panneaux";

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
    <PileDePanneaux>
      <Panneau surface="papier" mesure="texte" className="md:py-pas-16 flex-1">
        <div className="gap-pas-4 flex items-center">
          <PileEnConstruction />
          <p className="text-petit text-stone-500">Un instant.</p>
        </div>
      </Panneau>
    </PileDePanneaux>
  );
}
