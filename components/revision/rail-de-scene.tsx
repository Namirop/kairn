import type { ReactNode } from "react";

/**
 * La forme du rail, partagée par la session et l'entraînement.
 *
 * Trois blocs : ce qu'on fait, où on en est, et ce qui vient après. En colonne,
 * ils se répartissent sur la hauteur et la pile se retrouve au milieu ; en bande,
 * ils s'alignent et le dernier passe à la ligne. C'est la seule différence entre
 * les deux formats — aucun contenu n'est retiré d'un côté ou de l'autre.
 */

/** L'intitulé d'un bloc de rail : mono, très petit, espacé, sur la roche. */
export const ETIQUETTE_RAIL = "text-mono font-mono tracking-[0.14em] text-stone-400 uppercase";

export function RailDeScene({ children }: { children: ReactNode }) {
  return (
    <div className="px-pas-4 py-pas-4 md:px-pas-8 lg:px-pas-6 lg:py-pas-8 gap-pas-3 lg:gap-pas-6 flex h-full flex-wrap items-center justify-between lg:flex-col lg:flex-nowrap lg:justify-between lg:text-center">
      {children}
    </div>
  );
}
