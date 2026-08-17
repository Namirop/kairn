import type { ReactNode } from "react";
import { PileDePanneaux } from "@/components/coquille/pile-de-panneaux";

/**
 * La scène d'un passage de questions : la colonne où l'on répond, et la bande
 * qui dit où l'on en est.
 *
 * Répondre et se situer sont deux choses, et elles se disputaient le même coin
 * de carte : la pile de session était posée en haut à droite de la question,
 * entre le sujet et l'énoncé, là où l'œil cherche ce qu'on lui demande. L'état
 * de la session a donc sa propre surface, et c'est la roche — l'écran se lit
 * alors en deux temps, la question sur le papier, le chemin sur la pierre.
 *
 * La bande vient en premier dans le document : c'est le cadre de ce qui suit, et
 * un lecteur d'écran gagne à l'entendre avant la question plutôt qu'après. Elle
 * passe à droite dès qu'il y a la largeur d'une colonne, et redevient une bande
 * en tête d'écran quand il n'y en a pas.
 *
 * La colonne fait quatre-vingt-dix caractères et non soixante-cinq, contre la
 * mesure de lecture du reste de l'application. Une question est un titre, pas un
 * paragraphe : serrée à la mesure du texte, elle tombait sur six lignes de trois
 * mots, et six lignes de trois mots se lisent moins bien que trois lignes
 * pleines. Ce qui est du corps de texte garde sa propre mesure là où il vit.
 */
export function SceneDeSession({
  enTete,
  rail,
  children,
}: {
  /** Ce qui nomme le passage en cours et permet de s'en aller. Facultatif. */
  enTete?: ReactNode;
  /**
   * L'état à montrer à côté des questions. Absent, la scène n'a qu'une colonne.
   *
   * L'entraînement n'en a pas : il n'y a rien à finir, donc rien à situer. Une
   * colonne de roche vide, ou pire une pile à monter, aurait promis une fin qui
   * n'existe pas.
   */
  rail?: ReactNode;
  children: ReactNode;
}) {
  return (
    <PileDePanneaux sol="ombre">
      <div className="flex flex-1 flex-col lg:flex-row">
        {rail ? (
          <aside className="bg-surface-roche grain grain-clair relative overflow-hidden text-stone-50 lg:order-2 lg:w-80 lg:shrink-0">
            <div className="relative z-10 h-full">{rail}</div>
          </aside>
        ) : null}

        <div className="px-pas-4 md:px-pas-8 py-pas-8 md:py-pas-12 grain relative flex-1 overflow-hidden lg:order-1">
          <div className="relative z-10 mx-auto w-full max-w-4xl">
            {enTete ? <div className="mb-pas-16">{enTete}</div> : null}
            {children}
          </div>
        </div>
      </div>
    </PileDePanneaux>
  );
}
