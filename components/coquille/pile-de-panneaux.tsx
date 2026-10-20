import type { ReactNode } from "react";
import { cn } from "@/lib/fusion-des-classes";
import { SURFACES, type Surface } from "./surfaces";

/**
 * Le sol reprend la surface du dernier panneau et remplit la hauteur, sinon une
 * page courte montre le fond du corps. Le dégagement de la barre basse porte
 * son propre grain (sans lui la teinte se lirait plus claire) : en
 * pseudo-élément de la pile, il se peindrait par-dessus les panneaux.
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
        // Prend ce qui reste sous l'en-tête, sans connaître sa hauteur.
        "flex flex-1 flex-col",
        SURFACES[sol].fond,
      )}
    >
      {children}

      {/* Dans la pile : sur la coquille, il prendrait la couleur du corps. */}
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
