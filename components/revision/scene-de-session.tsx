import type { ReactNode } from "react";
import { PileDePanneaux } from "@/components/coquille/pile-de-panneaux";
import { MotDeMarge } from "@/components/revision/mot-de-marge";

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
 * La colonne est large — bien plus que la mesure de lecture du reste de
 * l'application. Une question est un titre, pas un paragraphe : serrée à
 * soixante-cinq caractères, elle tombait sur six lignes de trois mots, et un
 * extrait de code cité dedans se coupait en deux. Ce qui est vraiment du corps de
 * texte garde sa propre mesure là où il vit — la réponse, les consignes, le
 * champ de saisie.
 *
 * **Le contenu est centré dans la hauteur.** Posé en haut, il laissait sous lui
 * un vide qui grandissait à chaque format court, et l'écran avait l'air d'avoir
 * mal chargé. Un `m-auto` plutôt qu'un `justify-center` : quand une question
 * dépasse la fenêtre, les marges automatiques tombent à zéro et rien ne devient
 * inatteignable — un centrage par le conteneur, lui, aurait coupé le haut.
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
   * Le nom du passage, repris en grand dans la marge gauche.
   *
   * Seulement quand la colonne est assez large pour l'accueillir sans se serrer.
   * L'en-tête efface alors le sien pour ne pas le dire deux fois, et le reprend
   * dès que la marge se referme — c'est la même requête de conteneur qui décide
   * des deux, donc l'un des deux est toujours là, jamais les deux.
   */
  mention?: string;
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
    <PileDePanneaux sol="session">
      {/* La déclaration que lit la coquille pour se retirer — voir
          `app/styles/shell.css`. Elle est posée ici parce que c'est ici qu'on sait qu'on
          est dans un passage, et nulle part ailleurs. */}
      <div data-passage className="flex flex-1 flex-col lg:flex-row">
        {rail ? (
          // En bande, elle suit le défilement. C'est la seule chose de l'écran
          // qui dise où l'on en est, et elle sortait du champ dès la première
          // question un peu longue : on répondait alors sans savoir s'il en
          // restait deux ou onze. En colonne, elle occupe déjà toute la hauteur
          // et n'a rien à suivre.
          //
          // Son ancrage suit l'en-tête, qui n'est pas là aux mêmes largeurs
          // qu'elle : effacé sur téléphone, la bande se colle au bord ; présent
          // entre les deux seuils, elle se pose dessous. Collée au bord dans les
          // deux cas, elle serait passée par-dessus lui sur une tablette.
          <aside className="bg-surface-roche grain grain-clair relative overflow-hidden text-stone-50 max-md:sticky max-md:top-0 max-md:z-20 md:max-lg:sticky md:max-lg:top-16 md:max-lg:z-20 lg:order-2 lg:w-80 lg:shrink-0">
            <div className="relative z-10 h-full">{rail}</div>
          </aside>
        ) : null}

        <div className="px-pas-4 md:px-pas-8 py-pas-scene grain @container relative flex flex-1 overflow-hidden lg:order-1">
          <div className="relative z-10 m-auto w-full max-w-6xl">
            {mention ? <MotDeMarge mot={mention} /> : null}

            {/* L'en-tête tient de près ce qu'elle nomme : à quatre pas de la
                première étiquette, elle flottait entre le bord de l'écran et la
                question, sans se rattacher ni à l'un ni à l'autre. */}
            {enTete ? <div className="mb-pas-8">{enTete}</div> : null}
            {children}
          </div>
        </div>
      </div>
    </PileDePanneaux>
  );
}
