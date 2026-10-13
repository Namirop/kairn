import { notFound } from "next/navigation";
import type { ReactNode } from "react";

/**
 * La vitrine d'assets — du tooling, pas du produit.
 *
 * Ces pages montent les vrais composants de révision et le vrai cairn pour que
 * les captures les tirent dans un état choisi, sans piloter de session. Elles
 * n'existent qu'en développement et seulement quand `ASSETS_PREVIEW` est armé :
 * `notFound()` partout ailleurs, donc inertes dans tout build de production.
 *
 * Tout le groupe est isolé sous `(apercu)` : il se retire d'un seul geste une
 * fois les captures faites, sans toucher au reste de l'application.
 */
export default function LayoutApercu({ children }: { children: ReactNode }) {
  if (process.env.NODE_ENV === "production" || process.env.ASSETS_PREVIEW !== "1") {
    notFound();
  }

  return children;
}
