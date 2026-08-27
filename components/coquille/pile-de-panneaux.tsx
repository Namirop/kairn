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
        // Le dégagement de la barre basse appartient à la pile : posé sur la
        // coquille, il se peignait de la couleur du corps sous le dernier
        // panneau.
        "pb-28 md:pb-0",
        SURFACES[sol].fond,
      )}
    >
      {children}
    </div>
  );
}
