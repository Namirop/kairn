"use client";

import { useReducedMotion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArêtesDePierre } from "@/components/cairn/aretes-de-pierre";
import { empiler, LARGEUR_VUE, type Pierre } from "@/lib/domain/cairn-stack";
import {
  periodeDuRang,
  PIERRES_DU_JEU,
  poserLaPierre,
  positionDuBalancier,
  type PierrePosee,
} from "@/lib/domain/jeu-du-cairn";

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
 * **Il n'y a rien à gagner ni à perdre.** Une pierre lâchée à côté se pose de
 * travers et la suivante arrive ; personne ne recommence, personne ne compte de
 * points. C'est une attente, et quelqu'un qui rate parce qu'il regardait
 * ailleurs a raison de regarder ailleurs : c'est son dépôt qu'il attend.
 *
 * Sous `prefers-reduced-motion`, il ne s'affiche pas du tout. Un jeu de timing
 * ne se dégrade pas en version immobile — il n'existe plus —, et proposer un
 * bouton qui ne mène nulle part vaut moins que ne rien proposer.
 */

/** Les bords que le balancier ne franchit pas, en unités de la vue. */
const MARGE = 6;

type Etat = { posees: PierrePosee[] };

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

  const [{ posees }, setEtat] = useState<Etat>({ posees: [] });
  const balancier = useRef<SVGGElement>(null);
  const x = useRef(LARGEUR_VUE / 2);

  const rang = posees.length;
  const fini = rang >= pierres.length;
  const enVol = pierres[rang];

  /*
    Le balancier bouge sans repasser par React.

    Soixante rendus par seconde pour déplacer un attribut, c'est soixante fois
    le travail de réconciliation de tout ce qui est autour — la liste des
    concepts, la carte de question — pour un `translate`. L'abscisse vit donc
    dans une référence, et seule la pose écrit dans l'état.
  */
  useEffect(() => {
    if (immobile || !enVol) return;

    const bord = enVol.largeur / 2 + MARGE;
    const [min, max] = [bord, LARGEUR_VUE - bord];
    const periode = periodeDuRang(rang, pierres.length);
    const depart = performance.now();
    let image = 0;

    const avancer = (maintenant: number) => {
      x.current = positionDuBalancier(maintenant - depart, periode, min, max);
      balancier.current?.setAttribute("transform", `translate(${x.current.toFixed(2)} ${enVol.y})`);
      image = requestAnimationFrame(avancer);
    };

    image = requestAnimationFrame(avancer);

    return () => cancelAnimationFrame(image);
  }, [immobile, enVol, rang, pierres.length]);

  const poser = useCallback(() => {
    setEtat((etat) => {
      const cible = pierres[etat.posees.length];

      if (!cible) return { posees: [] };

      return { posees: [...etat.posees, poserLaPierre(x.current, cible.x)] };
    });
  }, [pierres]);

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
        aria-label={
          fini
            ? "Le cairn est monté. Recommencer."
            : `Poser une pierre. ${rang} sur ${pierres.length} posées.`
        }
        className="rounded-carte bg-surface-ombre px-pas-4 py-pas-3 hover:bg-surface-ombre/70 w-full max-w-56 transition-colors"
      >
        <svg
          viewBox={`0 ${-hauteur + ySol} ${LARGEUR_VUE} ${hauteur}`}
          className="h-auto w-full"
          aria-hidden
        >
          {pierres.map((pierre, index) => (
            <PierreDuJeu key={pierre.cle} pierre={pierre} posee={posees[index]} />
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

      <p className="text-petit min-h-10 max-w-56 text-center text-stone-500">
        {fini
          ? "Le cairn tient. Appuie encore pour le remonter."
          : "Appuie quand la pierre est dans l'axe. Ça ne compte pour rien."}
      </p>
    </div>
  );
}

/**
 * Une pierre du jeu : son emplacement en pointillé tant qu'elle n'est pas posée,
 * son tracé plein ensuite, à l'abscisse où elle a vraiment atterri.
 *
 * Une pierre posée de travers garde son inclinaison d'origine ; celle qui est
 * tombée dans la tolérance se cale sur le pointillé, rotation comprise. C'est
 * le seul retour du jeu, et il suffit — la pile penche ou elle ne penche pas.
 */
function PierreDuJeu({ pierre, posee }: { pierre: Pierre; posee: PierrePosee | undefined }) {
  if (!posee) {
    return (
      <g transform={`translate(${pierre.x} ${pierre.y}) rotate(${pierre.rotation})`}>
        <ArêtesDePierre pierre={pierre} derniere={false} aVenir />
      </g>
    );
  }

  const penchee = posee.dAplomb ? pierre.rotation : pierre.rotation + (posee.x - pierre.x) * 0.35;

  return (
    <g transform={`translate(${posee.x.toFixed(2)} ${pierre.y}) rotate(${penchee.toFixed(2)})`}>
      {/* La chute vit sur un groupe intérieur : posée sur celui qui porte la
          position, l'animation en écraserait le `transform` et la pierre
          repartirait au coin du dessin. */}
      <g className="motion-safe:pierre-qui-tombe">
        <ArêtesDePierre pierre={pierre} derniere={false} />
      </g>
    </g>
  );
}
