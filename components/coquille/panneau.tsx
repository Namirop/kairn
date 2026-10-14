import type { ReactNode } from "react";
import { cn } from "@/lib/fusion-des-classes";
import { SURFACES, type Surface } from "./surfaces";

/**
 * Un panneau : une bande pleine largeur qui porte sa surface, l'unité de
 * composition des pages. Le fond va d'un bord à l'autre, le contenu reste dans
 * une mesure centrée.
 *
 * Le grain vit ici, sous le contenu, pour ne pas sabler les lettres.
 */

/**
 * Mesures de contenu. Une page choisit la mesure de ce qu'elle porte, centré
 * dedans. Les mesures à colonnes s'élargissent sur très grand écran ; `texte`
 * reste à ~65 signes au corps actuel, la bonne longueur de lecture.
 */
const MESURES = {
  texte: "max-w-2xl",
  colonne: "max-w-3xl",
  page: "max-w-6xl 2xl:max-w-[84rem]",
  large: "max-w-7xl 2xl:max-w-[96rem]",
} as const;

export type Mesure = keyof typeof MESURES;

export function Panneau({
  id,
  surface = "papier",
  mesure = "page",
  aere = false,
  centre = false,
  remplit = false,
  fond: matiere,
  ciel = false,
  className,
  children,
}: {
  /** Ancre du panneau, pour qu'un lien de la même page puisse y mener. */
  id?: string;
  surface?: Surface;
  mesure?: Mesure;
  /**
   * Le rythme ample d'un panneau de marketing. `--pas-campagne` suit la hauteur
   * de la fenêtre, pour ne pas pousser le contenu sous le pli d'un portable.
   */
  aere?: boolean;
  /**
   * Contenu centré dans toute la hauteur du panneau. Réservé à ce qui n'est pas
   * une page (une attente, un message court), qui en haut à gauche aurait l'air
   * d'une page pas finie de charger.
   */
  centre?: boolean;
  /**
   * Le panneau porte le ciel au lieu de sa surface. Réservé à l'ouverture.
   * `--ciel` vaut le papier par défaut : sans palette à l'essai, ce drapeau ne
   * change rien.
   */
  ciel?: boolean;
  /**
   * Le panneau prend toute la hauteur qui reste dans la pile. À poser sur le
   * dernier panneau d'une page : sinon le grain s'arrête avec lui et laisse une
   * couture visible, même quand la teinte du sol est la bonne.
   */
  remplit?: boolean;
  /** Ce qui vit derrière le contenu, sous le grain. Une texture, jamais un texte. */
  fond?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  const { fond, encre, grain } = SURFACES[surface];

  return (
    <section
      id={id}
      /*
        La surface est déclarée, pas seulement peinte : l'anneau de focus en
        dépend. `lichen-deep` tombe à 2,48:1 sur la roche, sous le seuil d'un
        indicateur de focus, et la feuille de style le relève sur cette surface.
      */
      data-surface={surface}
      className={cn(
        "relative w-full overflow-hidden",
        /*
          Le `scroll-mt` va sur la section, qui porte l'ancre : posé sur le bloc
          de contenu (où arrive `className`), il ne s'applique à rien. S'arrêter
          plus haut garde à l'écran la coupe qu'on vient de traverser.
        */
        id && "scroll-mt-pas-16 md:scroll-mt-[22svh]",
        remplit ? "flex-1" : "shrink-0",
        centre && "flex flex-col justify-center",
        ciel ? "ciel" : fond,
        encre,
        // Le ciel porte sa propre matière, plus dense que le grain d'un panneau.
        ciel ? undefined : grain,
      )}
    >
      {matiere ? <div aria-hidden>{matiere}</div> : null}

      <div
        className={cn(
          "px-pas-6 md:px-pas-8 relative z-10 mx-auto w-full",
          MESURES[mesure],
          // Les deux rythmes suivent la hauteur de la fenêtre, pour que les
          // marges de panneaux empilés ne poussent pas le contenu sous le pli.
          aere ? "py-pas-campagne" : "py-pas-dedans",
          centre && "flex flex-col items-center text-center",
          className,
        )}
      >
        {children}
      </div>
    </section>
  );
}
