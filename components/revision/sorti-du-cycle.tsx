"use client";

import { useState } from "react";
import { annulerMaitriseAction } from "@/app/(app)/depots/actions";
import { Button } from "@/components/ui/button";

/**
 * Le rattrapage d'un « je maîtrise ça ».
 *
 * Le mauvais clic le plus probable est celui qu'on vient de faire. Sans cette
 * bande, il faudrait deviner qu'on peut le défaire, et deviner où — personne ne
 * devinerait, et le geste vaudrait perte du concept pour trois mois.
 *
 * Elle disparaît dès que la question suivante est engagée : ce qui traîne
 * indéfiniment sur un écran cesse d'être lu.
 */
export function SortiDuCycle({
  concept,
  onAnnule,
}: {
  concept: { atomId: string; concept: string };
  onAnnule: () => void;
}) {
  const [enCours, setEnCours] = useState(false);

  async function annuler() {
    setEnCours(true);

    if (await annulerMaitriseAction(concept.atomId)) onAnnule();
    else setEnCours(false);
  }

  return (
    <div
      role="status"
      className="mb-pas-8 pl-pas-4 border-lichen mx-auto w-full max-w-2xl border-l-2"
    >
      <div className="gap-pas-3 flex flex-wrap items-baseline justify-between">
        <p className="text-mono font-mono tracking-[0.12em] text-stone-500 uppercase">
          Sorti du cycle
        </p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={enCours}
          onClick={() => void annuler()}
        >
          Annuler
        </Button>
      </div>

      {/* Le concept sur sa propre ligne, borné : la carte a déjà avancé, il faut
          dire lequel — mais un pavé de trois lignes chasserait la question. */}
      <p className="text-petit line-clamp-2 text-stone-900">{concept.concept}</p>
      <p className="mt-pas-1 text-petit text-stone-500">Il reviendra dans trois mois.</p>
    </div>
  );
}
