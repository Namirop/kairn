"use client";

import { useReducedMotion } from "motion/react";
import { AireDuCairn } from "@/components/site/aire-du-cairn";
import { useJeuDuCairn } from "@/components/site/use-jeu-du-cairn";

/**
 * Le cairn à empiler, pendant que le dépôt travaille.
 *
 * **Il occupe l'attente entière, pas une de ses étapes.** Le découpage rend en
 * six secondes de médiane, l'écriture des questions en vingt : un occupant monté
 * dans l'une des deux disparaît au passage à l'autre, et c'est exactement ce
 * qu'on reprochait à la question de démonstration qui vivait ici avant — posée à
 * trois secondes dans une attente qui en dure six, elle n'avait pas le temps
 * d'être lue. Celui-ci est monté par `ResultatDeLEssai`, qui survit aux deux, et
 * il ignore donc les étapes.
 *
 * Le geste est celui du produit : on empile. Pas on casse — un jeu dont le verbe
 * contredit la métaphore de la page qui le porte détruit ce que la page vend.
 *
 * **Le cairn peut tomber, et c'est ce qui fait viser.** Une pierre qui ne repose
 * plus sur celle du dessous entraîne la pile, et il faut la reprendre du sol.
 * Sans cette chute, poser était une case à cocher : l'empilement tenait quoi
 * qu'on fasse, donc viser ne servait à rien.
 *
 * **Et la visée se paie**, depuis le 30/08 : deux points pour une pierre
 * d'aplomb, un pour une pierre qui penche mais qui tient, zéro et retour au sol
 * pour une chute. Le compte ne sort pas de la page — rien n'est gardé, rien
 * n'est envoyé, le dépôt qui tourne derrière ne s'en aperçoit toujours pas. Il
 * dure le temps d'une pile, et il donne au geste ce qui lui manquait : une
 * différence visible entre poser juste et poser à peu près. Les règles sont dans
 * `score-du-cairn.ts`, la partie dans `useJeuDuCairn`, les retours dans
 * `retour-du-jeu.tsx`.
 *
 * Sous `prefers-reduced-motion`, il ne s'affiche pas du tout. Un jeu de timing
 * ne se dégrade pas en version immobile — il n'existe plus —, et proposer un
 * bouton qui ne mène nulle part vaut moins que ne rien proposer.
 */
export function CairnAEmpiler() {
  const immobile = useReducedMotion() ?? false;
  const jeu = useJeuDuCairn(immobile);

  if (immobile) return null;

  return (
    <div className="gap-pas-3 flex w-full max-w-72 flex-col items-center">
      {/* Le compteur partage la ligne du libellé plutôt que d'ouvrir la sienne :
          c'est une mesure de second plan, elle tient dans la place qui existait
          déjà. Il n'apparaît qu'une fois la première pierre posée — un zéro
          affiché avant qu'on ait joué annonce un score à faire, alors que le jeu
          se propose et ne se demande pas. */}
      <div className="text-mono flex w-full items-baseline justify-between font-mono tracking-[0.14em] text-stone-500 uppercase">
        <p>En attendant</p>
        {jeu.score > 0 ? (
          <p className="tabular-nums">
            {jeu.score} point{jeu.score > 1 ? "s" : ""}
          </p>
        ) : null}
      </div>

      <AireDuCairn
        pierres={jeu.pierres}
        hauteur={jeu.hauteur}
        ySol={jeu.ySol}
        posees={jeu.posees}
        tombe={jeu.tombe}
        fin={jeu.fin}
        manche={jeu.manche}
        enVol={jeu.enVol}
        balancier={jeu.balancier}
        onPoser={jeu.poser}
      />

      <p className="text-petit min-h-10 text-center text-stone-500">
        {jeu.tombe
          ? "Le cairn est tombé. Appuie pour le reprendre du sol."
          : jeu.fin
            ? "Appuie encore pour le remonter."
            : "Appuie quand la pierre est dans l'axe. Trop de travers et le cairn tombe."}
      </p>
    </div>
  );
}
