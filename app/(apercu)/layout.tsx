import { notFound } from "next/navigation";
import type { ReactNode } from "react";

/**
 * La vitrine d'assets, de l'outillage et pas du produit : les vrais composants
 * montés dans un état choisi, pour les captures. `notFound()` hors
 * développement ou sans `ASSETS_PREVIEW=1`. Le groupe se retire d'un bloc.
 */
export default function LayoutApercu({ children }: { children: ReactNode }) {
  if (process.env.NODE_ENV === "production" || process.env.ASSETS_PREVIEW !== "1") {
    notFound();
  }

  return children;
}
