import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { SURFACES, type Surface } from "./surfaces";

/**
 * Un panneau : une bande pleine largeur qui porte sa surface.
 *
 * C'est l'unité de composition de toutes les pages. Le fond va d'un bord à
 * l'autre — c'est lui qui donne le rythme —, le contenu reste dans une mesure
 * centrée. Sur un écran très large, c'est donc la surface qui s'étend, jamais
 * la ligne de texte.
 *
 * Le grain vit ici, derrière le contenu : monté à une opacité où il se sent
 * enfin, il ne sable pas les lettres puisqu'il passe dessous.
 */

/**
 * Mesures de contenu.
 *
 * Elles serrent le contenu au lieu de le laisser flotter : une colonne de 600
 * pixels posée à gauche d'un conteneur de 1000 laissait deux fois plus de vide
 * à droite qu'à gauche, et ça se voyait avant même de savoir pourquoi. Une page
 * choisit la mesure de ce qu'elle porte, et ce qu'elle porte est centré dedans.
 *
 * Les mesures à plusieurs colonnes ont gagné un cran, et un second au-delà de
 * quinze cents pixels : sur un écran de deux mille cinq cents, un tableau de
 * bord serré à mille occupait moins de la moitié de la fenêtre et se lisait
 * comme une colonne perdue au milieu. Les mesures de lecture, elles, ne bougent
 * pas — `texte` fait environ soixante-cinq signes au corps actuel, ce qui est
 * exactement ce qu'on veut, et l'élargir dégraderait la lecture au lieu de
 * l'améliorer.
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
  className,
  children,
}: {
  /** Ancre du panneau, pour qu'un lien de la même page puisse y mener. */
  id?: string;
  surface?: Surface;
  mesure?: Mesure;
  /**
   * Le rythme d'un panneau de marketing, plus ample que celui d'un écran.
   *
   * Ample **relativement à la fenêtre** : `--pas-campagne` suit sa hauteur, si
   * bien qu'un même panneau ouvre de six pas sur un grand écran et de trois sur
   * un portable, au lieu de déborder du pli sur le second.
   */
  aere?: boolean;
  /**
   * Contenu centré dans toute la hauteur du panneau.
   *
   * Réservé à ce qui n'est pas une page : une attente, un message qui tient en
   * deux lignes. Posés en haut à gauche d'un panneau vide, ils ont l'air d'un
   * bout de page qui n'a pas fini de charger — ce qui, pour une attente, est
   * une ironie coûteuse.
   */
  centre?: boolean;
  /**
   * Le panneau prend toute la hauteur qui reste dans la pile.
   *
   * À poser sur le dernier panneau d'une page. Sans lui, le grain s'arrêtait
   * avec le panneau et laissait une couture visible en travers de l'écran, là
   * même où on croyait avoir réglé le problème en peignant le sol de la bonne
   * couleur : c'est la texture qui trahissait la jointure, pas la teinte.
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
      className={cn(
        "relative w-full overflow-hidden",
        /*
          Un panneau ancré s'arrête bien au-dessus de son bord.

          La marge appartient à la **section**, parce que c'est elle qui porte
          l'ancre. Posée sur le bloc de contenu — là où arrive `className` —,
          elle ne s'applique à rien : le navigateur cale l'élément visé, et
          l'élément visé est la section. On peut alors augmenter la valeur autant
          qu'on veut sans que le point d'arrivée bouge d'un pixel, ce qui est
          exactement ce qui s'est passé deux fois de suite.

          Ce qu'on gagne à s'arrêter plus haut : la coupe de roche qu'on vient de
          traverser reste à l'écran, et le saut se lit comme une descente plutôt
          que comme un changement de page.
        */
        id && "scroll-mt-pas-16 md:scroll-mt-[22svh]",
        remplit ? "flex-1" : "shrink-0",
        centre && "flex flex-col justify-center",
        fond,
        encre,
        grain,
      )}
    >
      {matiere ? <div aria-hidden>{matiere}</div> : null}

      <div
        className={cn(
          "px-pas-6 md:px-pas-8 relative z-10 mx-auto w-full",
          MESURES[mesure],
          // Les deux rythmes suivent la fenêtre : sur un écran de mille
          // quatre-vingts, six pas de marge sur deux panneaux empilés font cent
          // pixels qui passent sous le pli sans rien porter.
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
