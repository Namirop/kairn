"use client";

import { Button } from "@/components/ui/button";

/**
 * « Je maîtrise ça », sous la question de la session du jour.
 *
 * Le geste appartient à la session : il repousse l'échéance à trois mois et
 * sort le concept du cycle. L'entraînement libre ne le propose pas — il ne
 * décide de rien de la mémoire, et offrir ce bouton depuis un tour qu'on fait
 * pour s'occuper serait le meilleur moyen de perdre un concept par mégarde.
 *
 * C'est le geste le plus lourd de l'écran, et il se présente comme tel : un
 * bouton dessiné, pas un lien de plus dans une rangée de liens. Il était posé au
 * même poids que le signalement, avec sa conséquence flottant à l'autre bout de
 * la ligne — rien ne disait laquelle des trois actions cette phrase décrivait,
 * et c'est le genre d'ambiguïté qui se paie en clics regrettés. La conséquence
 * est donc collée au bouton, sur la même ligne, et à personne d'autre.
 */
export function SortieDuCycleAction({
  enCours,
  onSortir,
}: {
  enCours: boolean;
  onSortir: () => void;
}) {
  return (
    <div className="gap-pas-3 flex flex-col sm:flex-row sm:items-center">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={enCours}
        onClick={onSortir}
        className="self-start sm:self-auto"
      >
        Je maîtrise ça
      </Button>

      {/* Ce que le geste fait vraiment : il repousse, il ne supprime pas, et il
          se défait. Annoncer « une seule fois » laissait croire l'inverse. */}
      <p className="text-petit max-w-sm text-stone-500">
        Le concept sort du cycle et revient dans trois mois pour vérifier. Ça se défait.
      </p>
    </div>
  );
}
