import type { Pierre } from "@/lib/domain/cairn-stack";

/**
 * Le tracé d'une pierre : sa forme, et l'arête de lichen quand c'est la
 * dernière posée.
 *
 * Ce fichier ne dépend d'aucune animation, contrairement à `pierre-posee.tsx` :
 * la pierre seule d'un état vide et les emplacements d'un compteur de session
 * n'ont pas à embarquer une librairie de mouvement pour ne jamais bouger.
 */

/**
 * Les nuances d'une pierre, selon la surface qui la porte.
 *
 * Sur la roche, les pierres s'inversent en gris clairs — sans quoi un
 * empilement sombre sur un panneau sombre n'existerait pas. Le lichen du
 * sommet, lui, ne bouge pas : c'est la constante de l'identité.
 */
const NUANCES = ["fill-stone-900", "fill-stone-800", "fill-stone-700"] as const;
const NUANCES_CLAIRES = ["fill-stone-50", "fill-stone-100", "fill-stone-300"] as const;

/** Le tracé de la pierre, et l'arête de lichen sur la dernière posée. */
export function ArêtesDePierre({
  pierre,
  derniere,
  clair = false,
}: {
  pierre: Pierre;
  derniere: boolean;
  clair?: boolean;
}) {
  return (
    <>
      <path d={pierre.chemin} className={(clair ? NUANCES_CLAIRES : NUANCES)[pierre.nuance]} />
      {derniere ? (
        <path
          d={pierre.chemin}
          className="stroke-lichen"
          strokeWidth={1.4}
          strokeLinecap="round"
          fill="none"
          pathLength={1}
          strokeDasharray="0.34 0.66"
          strokeDashoffset={-0.04}
        />
      ) : null}
    </>
  );
}
