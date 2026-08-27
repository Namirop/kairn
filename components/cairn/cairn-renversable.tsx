"use client";

import { useMemo } from "react";
import { useReducedMotion } from "motion/react";
import { Cairn } from "@/components/cairn/cairn";
import { ArêtesDePierre } from "@/components/cairn/aretes-de-pierre";
import { PoseDePierre } from "@/components/cairn/pose-de-pierre";
import { SolDuCairn } from "@/components/cairn/sol-du-cairn";
import { useAnimationPossible } from "@/components/cairn/use-animation-possible";
import { useChuteDesPierres } from "@/components/cairn/use-chute-des-pierres";
import { SANS_BORDS } from "@/lib/domain/cairn-physique";
import { empiler, LARGEUR_VUE } from "@/lib/domain/cairn-stack";
import { cn } from "@/lib/utils";

/**
 * Le cairn de la page publique, que l'on peut faire tomber d'un geste.
 *
 * Réservé au registre marketing : sur le tableau de bord, chaque pierre est un
 * concept que l'utilisateur a consolidé, et le faire tomber d'un mouvement de
 * souris serait un mauvais message. Ici, l'empilement est décoratif.
 *
 * Il n'a pas de boîte, et pas de bords non plus. Le dessin déborde de son SVG —
 * `overflow-visible` — et rien n'arrête les pierres latéralement : selon la
 * force du geste, elles glissent sur le titre, sortent de la fenêtre par un côté
 * comme par l'autre, ou s'écroulent sur place. Un empilement qui rebondit sur
 * des murs invisibles ne se coupe pas, il se secoue.
 *
 * Quand l'utilisateur refuse le mouvement, le composant rend le cairn ordinaire
 * et ne pose aucun gestionnaire : l'effet disparaît entièrement plutôt qu'à
 * moitié.
 *
 * **Il se pose en arrivant, comme celui du tableau de bord.** Il apparaissait
 * empilé d'un coup, alors que c'est le seul objet de l'ouverture qui puisse
 * raconter le produit sans une phrase : les pierres se posent l'une après l'autre,
 * la dernière vient de plus haut. La pose et la chute ne se disputent rien — la
 * physique déplace le groupe extérieur, qui porte la place de la pierre dans
 * l'empilement, et la pose n'anime que son contenu.
 */
export function CairnRenversable({
  nombre,
  graines,
  className,
}: {
  nombre: number;
  graines?: string[];
  className?: string;
}) {
  const immobile = useReducedMotion() ?? false;
  const pose = useAnimationPossible(immobile);
  const { pierres, hauteur, ySol } = useMemo(() => empiler(nombre, graines), [nombre, graines]);
  const chute = useChuteDesPierres(pierres, !immobile, SANS_BORDS);

  if (immobile) return <Cairn nombre={nombre} graines={graines} className={className} />;

  return (
    <div
      /* La croix, et pas une pierre dessinée. Un curseur en forme de pierre
         disait la matière mais pas le geste : posé sur un empilement de
         pierres, il s'y confondait, et il fallait le voir bouger pour
         comprendre qu'on tenait quelque chose. La croix vise, et c'est
         exactement ce qu'on fait ici — on passe au travers.

         Les gestes sont écoutés ici plutôt que sur le dessin : la zone de prise
         posée au-dessus les fait remonter jusque-là, et le repère du viewBox se
         calcule depuis le SVG quoi qu'il arrive. */
      className={cn("relative h-full w-full cursor-crosshair touch-pan-y", className)}
      onPointerMove={chute.surDeplacement}
      onPointerDown={chute.surAppui}
      onPointerLeave={chute.surSortie}
      /* La fin d'un geste tactile efface le dernier point. Sans ça, le premier
         déplacement du geste suivant se mesurerait depuis là où le précédent
         s'est arrêté : une distance parcourue en zéro seconde, donc une vitesse
         absurde et une pierre expédiée hors de l'écran. */
      onPointerUp={chute.surSortie}
      onPointerCancel={chute.surSortie}
    >
      <svg
        ref={chute.refSvg}
        viewBox={`0 ${-hauteur + ySol} ${LARGEUR_VUE} ${hauteur}`}
        className="h-full w-full overflow-visible"
        role="img"
        aria-label={`Empilement de ${nombre} pierres. Passe la souris ou le doigt au travers pour le faire tomber.`}
      >
        <SolDuCairn />
        {pierres.map((pierre, rang) => (
          <g
            key={pierre.cle}
            ref={(element) => {
              chute.refsGroupes.current[rang] = element;
            }}
            transform={`translate(${pierre.x} ${pierre.y}) rotate(${pierre.rotation})`}
          >
            <PoseDePierre rang={rang} derniere={rang === pierres.length - 1} anime={pose}>
              <ArêtesDePierre pierre={pierre} derniere={rang === pierres.length - 1} />
            </PoseDePierre>
          </g>
        ))}
      </svg>

      {/* La zone de prise, et c'est elle qui règle le partage du geste au doigt.

          Le bloc entier gardait la verticale au défilement et ne prenait que
          l'horizontale : un balayage oblique — le geste naturel pour faucher un
          empilement — partait au défilement avant d'avoir touché une pierre, et
          seul un mouvement strictement latéral marchait. Tout bloquer aurait
          fait du cairn un trou dans la page, à l'endroit où il est le plus
          grand.

          Cette bande-ci ne bloque rien d'autre que la colonne où les pierres se
          trouvent — la pierre de base fait soixante unités de viewBox sur cent,
          les autres moins. Le doigt posé dessus appartient au cairn, quelle que
          soit la direction qu'il prend ensuite ; posé de part et d'autre, il
          appartient à la page, qui défile comme partout ailleurs.

          Elle est transparente et n'intercepte rien : les gestes remontent au
          bloc qui les écoute. Sa seule fonction est d'être ce que le doigt
          touche, parce que `touch-action` se lit sur ce qu'on touche. */}
      <span aria-hidden className="absolute inset-y-0 left-[16%] w-[68%] touch-none" />
    </div>
  );
}
