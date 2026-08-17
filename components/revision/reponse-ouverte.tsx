"use client";

import { BarreDeNotation } from "@/components/revision/barre-de-notation";
import { BlocReponse } from "@/components/revision/bloc-reponse";
import { Button } from "@/components/ui/button";
import type { ReviewRating } from "@/lib/db/types";
import { etalonLisible } from "@/lib/domain/etalon-lisible";
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
 * comparaison, et c'est la personne qui compare — d'où la consigne : sans
 * réponse formulée, il n'y a rien à comparer et l'écran ne sert qu'à lire.
 *
 * Cette consigne est la demande de l'écran, et elle se lit comme telle : au
 * poids du corps, avec le bouton juste dessous. Empilée en trois morceaux — une
 * ligne, une deuxième plus pâle, puis un bouton, puis un lien — elle n'était
 * plus qu'un des quatre éléments d'une colonne molle. La raison de la consigne
 * tient sur la même ligne que le bouton : elle explique, elle ne demande rien.
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
      <div className="mt-pas-scene">
        <p className="text-corps text-stone-900">Formule ta réponse d&apos;abord, même de tête.</p>

        <div className="gap-pas-4 mt-pas-3 flex flex-col sm:flex-row sm:items-center">
          <Button type="button" onClick={onReveler} className="w-full shrink-0 sm:w-auto">
            Voir la réponse
          </Button>

          <p className="text-petit max-w-xs text-stone-500">
            C&apos;est l&apos;effort de la retrouver qui la fixe.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-pas-scene">
      <BlocReponse>
        <TexteTechnique>{etalonLisible(answerKey)}</TexteTechnique>
      </BlocReponse>

      {/* Se juger est un autre geste que lire : l'écart le dit. */}
      <div className="mt-pas-scene">
        <BarreDeNotation enCours={enCours} onNoter={onSeJuger} />
      </div>
    </div>
  );
}
