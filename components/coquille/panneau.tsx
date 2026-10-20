import type { ReactNode } from "react";
import { cn } from "@/lib/fusion-des-classes";
import { SURFACES, type Surface } from "./surfaces";

/**
 * Une bande pleine largeur qui porte sa surface, le contenu dans une mesure
 * centrée. Le grain vit ici, sous le contenu, pour ne pas sabler les lettres.
 */

/** `texte` tient ~65 signes, la longueur de lecture ; les autres s'élargissent en très grand. */
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
  id?: string;
  surface?: Surface;
  mesure?: Mesure;
  /** Rythme du marketing ; `--pas-campagne` suit la hauteur, pour tenir au-dessus du pli. */
  aere?: boolean;
  /** Pour ce qui n'est pas une page : en haut à gauche, on la croirait en chargement. */
  centre?: boolean;
  /** Réservé à l'ouverture. `--ciel` vaut le papier sans palette à l'essai. */
  ciel?: boolean;
  /** Sur le dernier panneau : sinon le grain s'arrête avec lui et laisse une couture visible. */
  remplit?: boolean;
  /** Sous le grain. Une texture, jamais un texte. */
  fond?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  const { fond, encre, grain } = SURFACES[surface];

  return (
    <section
      id={id}
      // Déclarée pour l'anneau de focus : `accent-profond` tombe à 1,39:1 sur la
      // roche, la feuille de style y passe à `accent-clair`.
      data-surface={surface}
      className={cn(
        "relative w-full overflow-hidden",
        // Sur la section, qui porte l'ancre : sur le bloc de contenu il ne
        // s'appliquerait pas. S'arrêter haut garde la coupe traversée à l'écran.
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
          // Deux rythmes indexés sur la hauteur : empilés, ils ne poussent pas sous le pli.
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
