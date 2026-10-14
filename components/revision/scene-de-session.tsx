import type { ReactNode } from "react";
import { PileDePanneaux } from "@/components/coquille/pile-de-panneaux";
import { MotDeMarge } from "@/components/revision/mot-de-marge";

/**
 * La scène d'un passage de questions : la colonne où l'on répond, et la bande
 * qui dit où l'on en est.
 *
 * La bande vient en premier dans le document : un lecteur d'écran entend le
 * cadre avant la question. Elle passe à droite (`lg:order-2`) dès qu'il y a la
 * largeur d'une colonne.
 *
 * La colonne est plus large que la mesure de lecture : une question est un
 * titre, et serrée à 65 caractères elle se casse en lignes de trois mots. Le
 * corps de texte (réponse, consignes, champ) garde sa propre mesure.
 *
 * Le contenu est centré en hauteur par `m-auto` et non `justify-center` : quand
 * une question dépasse la fenêtre, les marges tombent à zéro, alors qu'un
 * centrage par le conteneur couperait le haut, devenu inatteignable.
 */
export function SceneDeSession({
  enTete,
  mention,
  rail,
  children,
}: {
  /** Ce qui nomme le passage en cours et permet de s'en aller. Facultatif. */
  enTete?: ReactNode;
  /**
   * Le nom du passage, repris en grand dans la marge gauche quand la colonne est
   * assez large. L'en-tête efface alors le sien : la même requête de conteneur
   * décide des deux, donc exactement l'un des deux est visible.
   */
  mention?: string;
  /**
   * L'état à montrer à côté des questions. Absent, la scène n'a qu'une colonne :
   * c'est le cas de l'entraînement, qui n'a pas de fin à situer.
   */
  rail?: ReactNode;
  children: ReactNode;
}) {
  return (
    <PileDePanneaux sol="session">
      {/* La déclaration que lit la coquille pour se retirer — voir
          `app/styles/shell.css`. */}
      <div data-passage className="flex flex-1 flex-col lg:flex-row">
        {rail ? (
          // En bande, elle colle au défilement pour rester visible sur une
          // question longue. Son ancrage suit l'en-tête : absent sur téléphone,
          // la bande colle au bord ; présent entre `md` et `lg`, elle se pose
          // dessous (`top-16`) pour ne pas passer par-dessus lui.
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
