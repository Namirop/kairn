"use client";

import type { ReactNode } from "react";
import { useVenirEnVue } from "@/components/revision/use-venir-en-vue";

/**
 * La réponse et le geste qui suit, amenés en vue ensemble : sur téléphone,
 * « Continuer » resterait sinon sous le pli. La marge de défilement dégage la
 * barre basse, qui flotte et masquerait le bouton sans qu'aucun calcul de
 * visibilité ne s'en aperçoive.
 */
export function SuiteDeLaQuestion({ children }: { children: ReactNode }) {
  const suite = useVenirEnVue<HTMLDivElement>();

  return (
    <div
      ref={suite}
      className="mt-pas-scene scroll-mb-[calc(var(--barre-basse)+var(--pas-4))] md:scroll-mb-[var(--pas-8)]"
    >
      {children}
    </div>
  );
}
