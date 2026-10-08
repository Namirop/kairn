import { useTranslations } from "next-intl";
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
 *
 * Elle occupe l'écran entier et se tient au milieu. Posée en haut à gauche,
 * elle ressemblait à un morceau de page arrivé avant les autres, ce qui est
 * exactement le contraire de ce qu'une attente doit dire.
 */
export default function Chargement() {
  const t = useTranslations("tableau.commun");

  return (
    <PileDePanneaux>
      <Panneau surface="papier" mesure="texte" centre remplit>
        <PileEnConstruction className="w-20 md:w-24" />
        <p className="mt-pas-6 text-petit text-stone-500">{t("chargement")}</p>
      </Panneau>
    </PileDePanneaux>
  );
}
