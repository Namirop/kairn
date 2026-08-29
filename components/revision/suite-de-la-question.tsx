"use client";

import type { ReactNode } from "react";
import { useVenirEnVue } from "@/components/revision/use-venir-en-vue";

/**
 * Ce qui s'ouvre sous une question une fois qu'on a répondu : la réponse, et le
 * geste qui suit.
 *
 * **Les deux viennent à l'écran ensemble, et c'est tout l'objet de ce
 * composant.** Le déplacement était accroché au bloc de réponse lui-même, donc
 * il n'amenait que lui : sur un téléphone, le bloc arrivait en vue et le bouton
 * qui le suit restait dessous, souvent derrière la barre du bas. On lisait le
 * pourquoi, puis il fallait défiler à la main pour trouver « Continuer » — au
 * moment précis où l'on veut enchaîner.
 *
 * La marge de défilement dit ce qu'il faut dégager en plus : la hauteur de la
 * barre basse, qui flotte au-dessus du contenu et masquerait le bouton sans
 * qu'aucun calcul de visibilité ne s'en aperçoive. Sur grand écran elle
 * n'existe pas, et le rembourrage y suffit.
 *
 * Le déplacement reste au minimum — `block: "nearest"`, voir `useVenirEnVue` —
 * et c'est ce qui garde la question et ses options à l'écran au-dessus. On vient
 * chercher une réponse : elle ne veut rien dire sans ce qu'elle répond.
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
