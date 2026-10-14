"use client";

import type { ReactNode } from "react";
import { useVenirEnVue } from "@/components/revision/use-venir-en-vue";

/**
 * Ce qui s'ouvre sous une question une fois qu'on a répondu : la réponse, et le
 * geste qui suit. Les deux viennent en vue ensemble : sur téléphone, le bouton
 * « Continuer » resterait sinon sous le pli.
 *
 * La marge de défilement dégage la barre basse, qui flotte au-dessus du contenu
 * et masquerait le bouton sans qu'aucun calcul de visibilité ne s'en aperçoive.
 * Le déplacement reste minimal (voir `useVenirEnVue`) pour garder la question
 * à l'écran.
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
