"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { annulerMaitriseAction } from "@/app/(app)/depots/actions";
import { Button } from "@/components/ui/button";

/**
 * Le rattrapage d'un « je maîtrise ça ». Le mauvais clic le plus probable est
 * celui qu'on vient de faire ; sans cette bande, personne ne devinerait qu'on
 * peut le défaire, et le concept sortirait pour trois mois. Elle disparaît dès
 * que la question suivante est engagée.
 *
 * L'état, son échéance et l'annulation tiennent sur une ligne : le geste reste
 * à portée du mot qu'il défait.
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
    // Elle se pose au lieu d'apparaître : l'œil est déjà parti vers la question
    // suivante, et sans mouvement seul le décalage du contenu la signalerait,
    // ce qui se lit comme un défaut de chargement.
    <div
      role="status"
      className="rounded-champ bg-surface-papier mb-pas-8 px-pas-4 py-pas-3 md:px-pas-6 bande-qui-se-pose w-full"
    >
      {/* Sur téléphone, le geste se pose au bout de la première ligne : seul à
          la ligne, il ne se rattachait plus à sa phrase. Dès `md`, il revient
          contre son mot. */}
      <div className="gap-pas-4 md:gap-pas-2 flex items-baseline justify-between md:flex-wrap md:justify-start">
        <p className="text-petit min-w-0 text-stone-500">
          {t.rich("sorti", {
            fort: (morceau) => <span className="font-semibold text-stone-900">{morceau}</span>,
          })}
        </p>

        {/* Souligné : en pilule il pesait plus que sa phrase, en fantôme il se
            perdait dans le gris ; il garde la hauteur de cible d'un bouton.
            Sans rembourrage droit sur téléphone, pour rester aligné sur la
            phrase du concept qui suit. */}
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

      {/* Une ligne suffit à dire de quel concept il s'agit ; plus, et la bande
          chasse la question. */}
      <p className="text-petit line-clamp-1 max-w-4xl text-stone-500">{concept.concept}</p>
    </div>
  );
}
