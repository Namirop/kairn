"use client";

import type { RefObject } from "react";
import { ArêtesDePierre } from "@/components/cairn/aretes-de-pierre";
import { PierreDuJeu } from "@/components/site/pierre-du-jeu";
import { GainDePoints, MotDeFin } from "@/components/site/retour-du-jeu";
import { LARGEUR_VUE, type Pierre } from "@/lib/domain/cairn-stack";
import { pointsDeLaPose, type FinDuCairn } from "@/lib/domain/score-du-cairn";
import type { PierrePosee } from "@/lib/domain/jeu-du-cairn";

/**
 * L'aire de jeu : le dessin, ce qu'on y pose, et ce qu'il répond.
 *
 * C'est un bouton, et c'est ce qui la rend utilisable sans une ligne de gestion
 * d'entrée : le clic, la tape, l'espace et l'entrée y marchent d'eux-mêmes, le
 * focus s'y voit, et le libellé dit où l'on en est à qui ne voit pas l'écran.
 *
 * Séparée des règles du jeu parce qu'elle ne décide de rien : elle reçoit un
 * état et le dessine. Le gain et le mot de fin se posent **par-dessus le SVG et
 * non dedans** — du texte dans un SVG se mesure en unités de vue, donc il
 * grossirait avec l'aire au lieu de garder le corps du reste de la page.
 */

export function AireDuCairn({
  pierres,
  hauteur,
  ySol,
  posees,
  tombe,
  fin,
  manche,
  enVol,
  balancier,
  onPoser,
}: {
  pierres: Pierre[];
  hauteur: number;
  ySol: number;
  posees: PierrePosee[];
  tombe: boolean;
  /** La pile est montée : `null` tant qu'elle ne l'est pas. */
  fin: FinDuCairn | null;
  /** Change à chaque reprise du sol, pour rejouer les retours. */
  manche: number;
  enVol: Pierre | undefined;
  balancier: RefObject<SVGGElement | null>;
  onPoser: () => void;
}) {
  const derniere = posees[posees.length - 1];
  const marque = pierres[posees.length - 1];
  const gain = derniere && derniere.pose !== "TOMBEE" ? pointsDeLaPose(derniere.pose) : null;

  return (
    <button
      type="button"
      onClick={onPoser}
      aria-label={libelleDeLAire(pierres.length, posees.length, tombe, fin !== null)}
      className="rounded-carte bg-surface-ombre px-pas-2 py-pas-3 hover:bg-surface-ombre/70 w-full max-w-72 transition-colors"
    >
      <span className="relative block">
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

        {gain !== null && derniere && marque ? (
          <GainDePoints
            key={`${manche}-${posees.length}`}
            gain={gain}
            parfait={derniere.pose === "DAPLOMB"}
            gauche={surLaLargeur(derniere.x)}
            haut={surLaHauteur(marque.y, hauteur, ySol)}
          />
        ) : null}

        {fin ? <MotDeFin key={`${manche}-fin`} fin={fin} /> : null}
      </span>
    </button>
  );
}

/**
 * D'une coordonnée de vue à un pourcentage de l'aire.
 *
 * Le SVG n'a pas de marge dans son bloc et sa hauteur suit sa largeur : sa boîte
 * épouse donc exactement le viewBox, et la règle de trois est exacte. Une seule
 * marge, et il faudrait mesurer plutôt que calculer.
 */
function surLaLargeur(x: number): string {
  return `${(x / LARGEUR_VUE) * 100}%`;
}

function surLaHauteur(y: number, hauteur: number, ySol: number): string {
  return `${((y - (ySol - hauteur)) / hauteur) * 100}%`;
}

/** Ce que l'aire de jeu annonce à qui ne voit pas l'écran. */
function libelleDeLAire(total: number, rang: number, tombe: boolean, fini: boolean): string {
  if (tombe) return "Le cairn est tombé. Recommencer.";
  if (fini) return "Le cairn est monté. Recommencer.";

  return `Poser une pierre. ${rang} sur ${total} posées.`;
}
