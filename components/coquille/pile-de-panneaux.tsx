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
        // La hauteur de l'en-tête, seul élément fixe au-dessus de la pile.
        "flex min-h-[calc(100dvh-3.5rem)] flex-col md:min-h-[calc(100dvh-4rem)]",
        SURFACES[sol].fond,
      )}
    >
      {children}
    </div>
  );
}
