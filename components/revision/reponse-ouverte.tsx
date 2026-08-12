"use client";

import { BarreDeNotation } from "@/components/revision/barre-de-notation";
import { Button } from "@/components/ui/button";
import type { ReviewRating } from "@/lib/db/types";
import { TexteTechnique } from "@/components/typographie/texte-technique";

/**
 * Les formats où seule la personne peut juger : réponse courte, explication,
 * code.
 *
 * Elle formule sa réponse, demande l'étalon, puis se situe. Le chronomètre
 * s'arrête au moment où elle demande à voir — jamais après : le temps de lire
 * une réponse ne dit rien du rappel.
 *
 * L'étalon n'est pas une correction qui tombe. C'est un point de comparaison,
 * et c'est la personne qui compare.
 */

export function ReponseOuverte({
  answerKey,
  revelee,
  onReveler,
  onSeJuger,
  enCours,
}: {
  answerKey: string;
  revelee: boolean;
  onReveler: () => void;
  onSeJuger: (note: ReviewRating) => void;
  enCours: boolean;
}) {
  if (!revelee) {
    return (
      <div className="mt-pas-12">
        <Button type="button" onClick={onReveler} className="w-full sm:w-auto">
          Comparer à l&apos;étalon
        </Button>
        <p className="mt-pas-3 text-petit max-w-prose text-stone-500">
          Formule ta réponse d&apos;abord, même de tête. C&apos;est l&apos;effort de la retrouver
          qui la fixe.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-pas-12">
      {/* L'intitulé colle à son contenu : ils sont une seule chose. */}
      <p className="text-mono font-mono tracking-[0.12em] text-stone-500 uppercase">
        L&apos;étalon
      </p>
      <p className="mt-pas-2 text-corps pl-pas-4 border-l-2 border-stone-300 leading-relaxed whitespace-pre-wrap text-stone-900">
        <TexteTechnique>{answerKey}</TexteTechnique>
      </p>

      {/* Se juger est un autre geste que lire : l'écart le dit. */}
      <div className="mt-pas-12">
        <BarreDeNotation enCours={enCours} onNoter={onSeJuger} />
      </div>
    </div>
  );
}
