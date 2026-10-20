"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { annulerMaitriseAction } from "@/app/(app)/depots/actions";
import { Button } from "@/components/ui/button";

/**
 * Le rattrapage d'un « je maîtrise ça » : le mauvais clic le plus probable est
 * celui qu'on vient de faire, et sans cette bande le concept sortirait pour trois
 * mois. Elle part dès que la question suivante est engagée.
 */
export function SortiDuCycle({
  concept,
  onAnnule,
}: {
  concept: { atomId: string; concept: string };
  onAnnule: () => void;
}) {
  const [enCours, setEnCours] = useState(false);
  const t = useTranslations("revision.question.maitrise");

  async function annuler() {
    setEnCours(true);

    if (await annulerMaitriseAction(concept.atomId)) onAnnule();
    else setEnCours(false);
  }

  return (
    // Elle se pose en mouvement : l'œil est déjà sur la question suivante, et un
    // simple décalage du contenu se lirait comme un défaut de chargement.
    <div
      role="status"
      className="rounded-champ bg-surface-papier mb-pas-8 px-pas-4 py-pas-3 md:px-pas-6 bande-qui-se-pose w-full"
    >
      {/* Sur téléphone, au bout de la première ligne : seul à la ligne, le geste
          se détacherait de sa phrase. */}
      <div className="gap-pas-4 md:gap-pas-2 flex items-baseline justify-between md:flex-wrap md:justify-start">
        <p className="text-petit min-w-0 text-stone-500">
          {t.rich("sorti", {
            fort: (morceau) => <span className="font-semibold text-stone-900">{morceau}</span>,
          })}
        </p>

        {/* Souligné : une pilule pèserait plus que sa phrase, un fantôme se
            perdrait dans le gris. Sans rembourrage droit sur téléphone, pour
            s'aligner sur la ligne du concept. */}
        <Button
          type="button"
          variant="link"
          size="sm"
          className="pl-pas-2 md:pr-pas-2 shrink-0 pr-0"
          disabled={enCours}
          onClick={() => void annuler()}
        >
          {t("annuler")}
        </Button>
      </div>

      {/* Plus d'une ligne, et la bande chasse la question. */}
      <p className="text-petit line-clamp-1 max-w-4xl text-stone-500">{concept.concept}</p>
    </div>
  );
}
