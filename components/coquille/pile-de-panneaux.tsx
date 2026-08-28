import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { SURFACES, type Surface } from "./surfaces";

/**
 * La pile de panneaux d'un écran, et le sol sur lequel elle repose.
 *
 * Une page plus courte que la fenêtre laissait apparaître, sous son dernier
 * panneau, la surface du corps — une bande d'une autre couleur qui ressemblait
 * à une erreur, parce que c'en était une : la pile s'arrêtait, le fond
 * continuait.
 *
 * Le sol reprend donc la surface du dernier panneau et remplit ce qui reste de
 * hauteur. Ce n'est pas un panneau de plus : c'est le même, prolongé jusqu'en
 * bas.
 *
 * **Le dégagement de la barre basse est une bande, plus un rembourrage.** La
 * couture est revenue une fois de plus par là : cent douze pixels peints de la
 * bonne couleur mais sans grain, juste sous un panneau grainé et juste au-dessus
 * de la navigation. Ça se lisait comme une zone plus claire, et c'était
 * exactement ça — la même teinte sans le bruit qui la mate.
 *
 * Le grain ne peut pas être posé sur la pile elle-même : il vit en
 * pseudo-élément, donc en dernier enfant, et il se peindrait par-dessus les
 * panneaux et leur texte. Il lui faut un élément à lui, et c'est cette bande.
 */
export function PileDePanneaux({
  sol = "papier",
  children,
}: {
  sol?: Surface;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        // La hauteur vient de la coquille, qui est une colonne : la pile prend
        // ce qui reste sous l'en-tête sans avoir à savoir combien il mesure —
        // ni même s'il est là. Elle le soustrayait en dur, et un écran qui s'en
        // passe laissait alors une bande de la couleur du corps sous lui.
        "flex flex-1 flex-col",
        SURFACES[sol].fond,
      )}
    >
      {children}

      {/* Le dégagement de la barre basse. Il appartient à la pile — posé sur la
          coquille, il se peignait de la couleur du corps sous le dernier
          panneau — et il porte la matière du sol, grain compris. */}
      <div
        aria-hidden
        className={cn(
          "relative h-28 shrink-0 overflow-hidden md:hidden",
          SURFACES[sol].fond,
          SURFACES[sol].grain,
        )}
      />
    </div>
  );
}
