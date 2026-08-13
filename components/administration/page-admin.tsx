import type { ReactNode } from "react";
import { Panneau } from "@/components/coquille/panneau";
import { PileDePanneaux } from "@/components/coquille/pile-de-panneaux";

/**
 * La coquille commune aux six écrans internes.
 *
 * Elle existe pour que chaque écran tienne en vingt lignes et ne porte que ce
 * qu'il a de particulier — sa garde, ses lectures, ses blocs. Six pages qui
 * recopient chacune leur titre et leur panneau finissent par diverger sur des
 * détails que personne n'a décidés.
 *
 * Le registre reste celui de l'interne : pas de police display, pas d'élément
 * signature, pas d'accent du produit. Les seules couleurs qui s'ajoutent ici
 * sont celles des marques de graphique, et elles encodent une grandeur.
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
