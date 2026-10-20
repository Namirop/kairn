import { notFound } from "next/navigation";
import type { ReactNode } from "react";

/** Outillage, pas produit : les vrais composants dans un état choisi, pour les captures. */
export default function LayoutApercu({ children }: { children: ReactNode }) {
  if (process.env.NODE_ENV === "production" || process.env.ASSETS_PREVIEW !== "1") {
    notFound();
  }

  return children;
}
