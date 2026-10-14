import type { ReactNode } from "react";
import { Panneau } from "@/components/coquille/panneau";
import { PileDePanneaux } from "@/components/coquille/pile-de-panneaux";

/**
 * La coquille commune aux écrans d'administration : chaque page ne porte que
 * sa garde, ses lectures et ses blocs.
 *
 * Registre interne : pas de police display, pas d'élément signature, pas
 * d'accent du produit.
 */
export function PageAdmin({
  titre,
  contexte,
  children,
}: {
  titre: string;
  contexte: string;
  children: ReactNode;
}) {
  return (
    <PileDePanneaux sol="papier">
      <Panneau surface="papier" mesure="page" remplit>
        <h1 className="text-h1-app font-bold text-stone-900">{titre}</h1>
        <p className="mt-pas-2 text-petit max-w-prose text-stone-500">{contexte}</p>

        <div className="mt-pas-8">{children}</div>
      </Panneau>
    </PileDePanneaux>
  );
}
