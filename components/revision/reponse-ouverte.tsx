"use client";

import { BarreDeNotation } from "@/components/revision/barre-de-notation";
import { Button } from "@/components/ui/button";
import type { ReviewRating } from "@/lib/db/types";
import { TexteTechnique } from "@/components/typographie/texte-technique";

/**
 * Les formats où seule la personne peut juger : réponse courte, explication,
 * code.
 *
 * Elle formule sa réponse, demande à voir, puis se situe. Le chronomètre
 * s'arrête au moment où elle demande — jamais après : le temps de lire une
 * réponse ne dit rien du rappel.
 *
 * Ce qui s'affiche alors n'est pas une correction qui tombe. C'est un point de
 * comparaison, et c'est la personne qui compare — d'où la consigne, avant le
 * bouton : sans réponse formulée, il n'y a rien à comparer et l'écran ne sert
 * qu'à lire.
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
        {/* La consigne avant le bouton, et au poids du corps : c'est ce qu'il faut
            avoir fait pour que le bouton serve à quelque chose. Posée dessous en
            petit, elle se lisait après le clic — trop tard. */}
        <p className="text-corps text-stone-900">Formule ta réponse d&apos;abord, même de tête.</p>
        <p className="mt-pas-2 text-petit max-w-prose text-stone-500">
          C&apos;est l&apos;effort de la retrouver qui la fixe.
        </p>

        <Button type="button" onClick={onReveler} className="mt-pas-6 w-full sm:w-auto">
          Voir la réponse
        </Button>
      </div>
    );
  }

  return (
    <div className="mt-pas-12">
      {/* L'intitulé colle à son contenu : ils sont une seule chose. Il reprend le
          mot du bouton qui l'a fait venir, et celui de la pierre jetée. */}
      <p className="text-mono font-mono tracking-[0.12em] text-stone-500 uppercase">La réponse</p>
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
