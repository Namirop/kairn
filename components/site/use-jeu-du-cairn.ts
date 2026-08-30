"use client";

import { type RefObject, useCallback, useMemo, useState } from "react";
import { useBalancier } from "@/components/site/balancier-du-cairn";
import { empiler, type Pierre } from "@/lib/domain/cairn-stack";
import { PIERRES_DU_JEU, poserLaPierre, type PierrePosee } from "@/lib/domain/jeu-du-cairn";
import { finDuCairn, scoreApresPose, type FinDuCairn } from "@/lib/domain/score-du-cairn";

/**
 * L'état d'une pile en cours : ce qui est posé, ce que ça vaut, et où en est le
 * balancier.
 *
 * Séparé de l'écran parce que ce sont deux choses différentes — la partie et son
 * dessin — et qu'aucune des deux ne tenait plus seule dans un fichier depuis que
 * la pose se compte.
 */

type Etat = {
  posees: PierrePosee[];
  tombe: boolean;
  score: number;
  /** Incrémentée à chaque reprise du sol : c'est elle qui rejoue les retours. */
  manche: number;
};

const DEPART: Etat = { posees: [], tombe: false, score: 0, manche: 0 };

/** Reprendre du sol : tout retombe à zéro, sauf le numéro de la manche. */
function repartir(manche: number): Etat {
  return { ...DEPART, manche: manche + 1 };
}

export type JeuDuCairn = Etat & {
  pierres: Pierre[];
  hauteur: number;
  ySol: number;
  /** La pile est montée et debout : `null` tant qu'elle ne l'est pas. */
  fin: FinDuCairn | null;
  /** La pierre qui va et vient, absente quand il n'y a plus rien à poser. */
  enVol: Pierre | undefined;
  balancier: RefObject<SVGGElement | null>;
  poser: () => void;
};

export function useJeuDuCairn(immobile: boolean): JeuDuCairn {
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

  const [etat, setEtat] = useState<Etat>(DEPART);

  const rang = etat.posees.length;
  const fin = etat.tombe
    ? null
    : finDuCairn(
        etat.posees.map((posee) => posee.pose),
        pierres.length,
      );
  const enVol = etat.tombe || fin !== null ? undefined : pierres[rang];

  const { balancier, x } = useBalancier(enVol, rang, pierres.length, immobile);

  const poser = useCallback(() => {
    setEtat((precedent) => {
      // Une pile tombée, comme une pile finie, se reprend du sol au geste
      // suivant : le même appui sert à jouer et à recommencer, il n'y a pas de
      // bouton « rejouer » à trouver.
      if (precedent.tombe) return repartir(precedent.manche);

      const cible = pierres[precedent.posees.length];

      if (!cible) return repartir(precedent.manche);

      // Ce qui la porte : la pierre du dessous là où elle repose vraiment, ou
      // la marque au sol pour la première.
      const appui = precedent.posees[precedent.posees.length - 1]?.x ?? cible.x;
      const posee = poserLaPierre(x.current, cible.x, appui);

      return {
        posees: [...precedent.posees, posee],
        tombe: posee.pose === "TOMBEE",
        score: scoreApresPose(precedent.score, posee.pose),
        manche: precedent.manche,
      };
    });
  }, [pierres, x]);

  return { ...etat, pierres, hauteur, ySol, fin, enVol, balancier, poser };
}
