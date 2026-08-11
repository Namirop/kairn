"use client";

import { Button } from "@/components/ui/button";

/**
 * « Je maîtrise ça », sous la question de la session du jour.
 *
 * Le geste appartient à la session : il repousse l'échéance à trois mois et
 * sort le concept du cycle. L'entraînement libre ne le propose pas — il ne
 * décide de rien de la mémoire, et offrir ce bouton depuis un tour qu'on fait
 * pour s'occuper serait le meilleur moyen de perdre un concept par mégarde.
 */
export function SortieDuCycleAction({
  enCours,
  onSortir,
}: {
  enCours: boolean;
  onSortir: () => void;
}) {
  return (
    <>
      <Button type="button" variant="ghost" size="sm" disabled={enCours} onClick={onSortir}>
        Je maîtrise ça
      </Button>
      {/* Ce que le geste fait vraiment : il repousse, il ne supprime pas, et
          il se défait. Annoncer « une seule fois » laissait croire l'inverse. */}
      <p className="mt-pas-1 text-petit text-stone-500">
        Le concept sort du cycle et revient dans trois mois pour vérifier. Ça se défait.
      </p>
    </>
  );
}
