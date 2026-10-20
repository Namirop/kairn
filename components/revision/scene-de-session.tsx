import type { ReactNode } from "react";
import { PileDePanneaux } from "@/components/coquille/pile-de-panneaux";
import { MotDeMarge } from "@/components/revision/mot-de-marge";

/**
 * La colonne où l'on répond et la bande qui dit où l'on en est.
 *
 * - La bande vient d'abord dans le document, pour qu'un lecteur d'écran entende
 *   le cadre avant la question ; `lg:order-2` la passe à droite.
 * - La colonne dépasse la mesure de lecture : une question est un titre, serrée
 *   à 65 caractères elle casse en lignes de trois mots.
 * - `m-auto` et non `justify-center` : une question plus haute que la fenêtre
 *   aurait sinon son haut coupé, inatteignable.
 */
export function SceneDeSession({
  enTete,
  mention,
  rail,
  children,
}: {
  enTete?: ReactNode;
  /**
   * Le nom du passage en grand dans la marge, quand la colonne est assez large.
   * La même requête de conteneur efface celui de l'en-tête : un seul est visible.
   */
  mention?: string;
  /** Absent pour l'entraînement, qui n'a pas de fin à situer. */
  rail?: ReactNode;
  children: ReactNode;
}) {
  return (
    <PileDePanneaux sol="session">
      {/* Lu par la coquille pour se retirer, voir `app/styles/coquille.css`. */}
      <div data-passage className="flex flex-1 flex-col lg:flex-row">
        {rail ? (
          // Collante sur une question longue. Sous `md` il n'y a pas d'en-tête,
          // elle colle au bord ; de `md` à `lg` elle se pose dessous (`top-16`).
          <aside className="bg-surface-roche grain grain-clair relative overflow-hidden text-stone-50 max-md:sticky max-md:top-0 max-md:z-20 md:max-lg:sticky md:max-lg:top-16 md:max-lg:z-20 lg:order-2 lg:w-80 lg:shrink-0">
            <div className="relative z-10 h-full">{rail}</div>
          </aside>
        ) : null}

        <div className="px-pas-4 md:px-pas-8 py-pas-scene grain @container relative flex flex-1 overflow-hidden lg:order-1">
          <div className="relative z-10 m-auto w-full max-w-6xl">
            {mention ? <MotDeMarge mot={mention} /> : null}

            {enTete ? <div className="mb-pas-8">{enTete}</div> : null}
            {children}
          </div>
        </div>
      </div>
    </PileDePanneaux>
  );
}
