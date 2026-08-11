import type { ReactNode } from "react";
import { PierreSeule } from "@/components/cairn/pierre-seule";

/**
 * Écran vide : un constat, un contexte, une action. Pas d'illustration, pas
 * d'emoji, pas de troisième phrase qui redit la deuxième.
 *
 * La pierre seule posée au sol remplace le cadre en pointillés — un rectangle
 * vide dessiné autour du vide n'ajoutait rien. Elle vient de la géométrie du
 * cairn : c'est le premier état de l'empilement, pas une icône.
 */
export function EtatVide({
  constat,
  contexte,
  action,
  graine,
}: {
  constat: string;
  contexte?: string;
  action?: ReactNode;
  /** Deux états vides voisins ne montrent pas la même pierre. */
  graine?: string;
}) {
  return (
    <div className="gap-pas-4 py-pas-6 flex items-start">
      <PierreSeule graine={graine} className="mt-pas-1 w-10 shrink-0" />

      <div>
        <p className="text-stone-900">{constat}</p>
        {contexte ? (
          <p className="mt-pas-1 text-petit max-w-md text-stone-500">{contexte}</p>
        ) : null}
        {action ? <div className="mt-pas-4">{action}</div> : null}
      </div>
    </div>
  );
}
