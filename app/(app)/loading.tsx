import { useTranslations } from "next-intl";
import { PileEnConstruction } from "@/components/cairn/pile-en-construction";
import { Panneau } from "@/components/coquille/panneau";
import { PileDePanneaux } from "@/components/coquille/pile-de-panneaux";

/** Pas de squelette : il promettrait une mise en page qu'on ne connaît pas encore. */
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
