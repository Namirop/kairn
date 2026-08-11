import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { SURFACES, type Surface } from "./surfaces";

/**
 * Un panneau : une bande pleine largeur qui porte sa surface.
 *
 * C'est l'unité de composition de toutes les pages. Le fond va d'un bord à
 * l'autre — c'est lui qui donne le rythme —, le contenu reste dans une mesure
 * centrée. Sur un écran très large, c'est donc la surface qui s'étend, jamais
 * la ligne de texte.
 *
 * Le grain vit ici, derrière le contenu : monté à une opacité où il se sent
 * enfin, il ne sable pas les lettres puisqu'il passe dessous.
 */

/** Mesures de contenu. `large` sert les pages à deux colonnes. */
const MESURES = {
  texte: "max-w-2xl",
  page: "max-w-5xl",
  large: "max-w-6xl",
} as const;

export type Mesure = keyof typeof MESURES;

export function Panneau({
  surface = "papier",
  mesure = "page",
  aere = false,
  className,
  children,
}: {
  surface?: Surface;
  mesure?: Mesure;
  /** Le rythme d'un panneau de marketing, plus ample que celui d'un écran. */
  aere?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const { fond, encre, grain } = SURFACES[surface];

  return (
    <section className={cn("relative w-full", fond, encre, grain)}>
      <div
        className={cn(
          "px-pas-4 md:px-pas-8 relative z-10 mx-auto w-full",
          MESURES[mesure],
          aere ? "py-pas-16 md:py-pas-24" : "py-pas-8 md:py-pas-12",
          className,
        )}
      >
        {children}
      </div>
    </section>
  );
}
