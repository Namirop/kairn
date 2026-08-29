"use client";

import { useReducedMotion } from "motion/react";
import { useCallback, useMemo, useState } from "react";
import { ArêtesDePierre } from "@/components/cairn/aretes-de-pierre";
import { useBalancier } from "@/components/site/balancier-du-cairn";
import { PierreDuJeu } from "@/components/site/pierre-du-jeu";
import { empiler, LARGEUR_VUE } from "@/lib/domain/cairn-stack";
import { PIERRES_DU_JEU, poserLaPierre, type PierrePosee } from "@/lib/domain/jeu-du-cairn";

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
 * **Le cairn peut tomber, et c'est la seule chose qu'on risque.** Rien n'est
 * compté, rien n'est gardé, le dépôt qui tourne derrière ne s'en aperçoit pas ;
 * mais une pierre qui ne repose plus sur celle du dessous entraîne la pile, et
 * il faut la reprendre du sol. Sans cette chute, poser était une case à cocher :
 * l'empilement tenait quoi qu'on fasse, donc viser ne servait à rien.
 *
 * Sous `prefers-reduced-motion`, il ne s'affiche pas du tout. Un jeu de timing
 * ne se dégrade pas en version immobile — il n'existe plus —, et proposer un
 * bouton qui ne mène nulle part vaut moins que ne rien proposer.
 */

type Etat = { posees: PierrePosee[]; tombe: boolean };

const DEPART: Etat = { posees: [], tombe: false };

export function CairnAEmpiler() {
  const immobile = useReducedMotion() ?? false;

  /*
    La graine ne change pas : le cairn à remplir est le même à chaque visite, et
    c'est ce qui permet au pointillé d'annoncer une forme plutôt qu'une surprise.

    Et il se calcule une fois. Recalculé à chaque rendu, `empiler` rend des
    objets neufs à chaque fois : la pierre en vol changeait donc d'identité à
    chaque pose, la boucle d'animation se relançait avec une nouvelle origine de
    temps, et le balancier repartait du bord gauche au lieu de continuer sa
    course. Ça ne se voit qu'en jouant.
  */
  const { pierres, hauteur, ySol } = useMemo(
    () =>
      empiler(
        PIERRES_DU_JEU,
        Array.from({ length: PIERRES_DU_JEU }, (_, rang) => `jeu-du-cairn-${rang}`),
      ),
    [],
  );

  const [{ posees, tombe }, setEtat] = useState<Etat>(DEPART);

  const rang = posees.length;
  const fini = !tombe && rang >= pierres.length;
  const enVol = tombe ? undefined : pierres[rang];

  const { balancier, x } = useBalancier(enVol, rang, pierres.length, immobile);

  const poser = useCallback(() => {
    setEtat((etat) => {
      // Une pile tombée, comme une pile finie, se reprend du sol au geste
      // suivant : le même appui sert à jouer et à recommencer, il n'y a pas de
      // bouton « rejouer » à trouver.
      if (etat.tombe) return DEPART;

      const cible = pierres[etat.posees.length];

      if (!cible) return DEPART;

      // Ce qui la porte : la pierre du dessous là où elle repose vraiment, ou
      // la marque au sol pour la première.
      const appui = etat.posees[etat.posees.length - 1]?.x ?? cible.x;
      const posee = poserLaPierre(x.current, cible.x, appui);

      return { posees: [...etat.posees, posee], tombe: posee.pose === "TOMBEE" };
    });
  }, [pierres, x]);

  if (immobile) return null;

  return (
    <div className="gap-pas-3 flex flex-col items-center">
      <p className="text-mono font-mono tracking-[0.14em] text-stone-500 uppercase">En attendant</p>

      {/*
        L'aire de jeu est un bouton, et c'est ce qui la rend utilisable sans une
        ligne de gestion d'entrée : le clic, la tape, l'espace et l'entrée y
        marchent d'eux-mêmes, le focus s'y voit, et le libellé dit où l'on en est
        à qui ne voit pas l'écran.
      */}
      <button
        type="button"
        onClick={poser}
        aria-label={libelleDeLAire(pierres.length, rang, tombe, fini)}
        className="rounded-carte bg-surface-ombre px-pas-2 py-pas-3 hover:bg-surface-ombre/70 w-full max-w-72 transition-colors"
      >
        <svg
          viewBox={`0 ${-hauteur + ySol} ${LARGEUR_VUE} ${hauteur}`}
          className="h-auto w-full"
          aria-hidden
        >
          {pierres.map((pierre, index) => (
            <PierreDuJeu
              key={pierre.cle}
              pierre={pierre}
              posee={posees[index]}
              rang={index}
              total={posees.length}
              effondre={tombe}
            />
          ))}

          {/* La pierre qui va et vient. Son abscisse est écrite par la boucle
              d'animation, pas par le rendu — d'où le `transform` initial, qui ne
              sert qu'à la première image. */}
          {enVol ? (
            <g ref={balancier} transform={`translate(${LARGEUR_VUE / 2} ${enVol.y})`}>
              <ArêtesDePierre pierre={enVol} derniere />
            </g>
          ) : null}
        </svg>
      </button>

      <p className="text-petit min-h-10 max-w-72 text-center text-stone-500">
        {tombe
          ? "Le cairn est tombé. Appuie pour le reprendre du sol."
          : fini
            ? "Le cairn tient. Appuie encore pour le remonter."
            : "Appuie quand la pierre est dans l'axe. Trop de travers et le cairn tombe."}
      </p>
    </div>
  );
}

/** Ce que l'aire de jeu annonce à qui ne voit pas l'écran. */
function libelleDeLAire(total: number, rang: number, tombe: boolean, fini: boolean): string {
  if (tombe) return "Le cairn est tombé. Recommencer.";
  if (fini) return "Le cairn est monté. Recommencer.";

  return `Poser une pierre. ${rang} sur ${total} posées.`;
}
