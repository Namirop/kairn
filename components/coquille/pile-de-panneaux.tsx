import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { SURFACES, type Surface } from "./surfaces";

/**
 * La pile de panneaux d'un écran, et le sol sur lequel elle repose : le sol
 * reprend la surface du dernier panneau et remplit la hauteur restante, sans
 * quoi une page courte laisserait voir le fond du corps.
 *
 * Le dégagement de la barre basse est un élément à part, grain compris : sans
 * grain, la même teinte se lirait plus claire. Le grain ne peut pas aller sur
 * la pile elle-même — en pseudo-élément, il se peindrait par-dessus les panneaux.
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
        // La coquille est une colonne : la pile prend ce qui reste sous
        // l'en-tête sans connaître sa hauteur, ni même savoir s'il est là.
        "flex flex-1 flex-col",
        SURFACES[sol].fond,
      )}
    >
      {children}

      {/* Le dégagement de la barre basse appartient à la pile : sur la
          coquille, il prendrait la couleur du corps. */}
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
