import type { Pierre } from "@/lib/domain/cairn-stack";

/**
 * Le tracé d'une pierre : sa forme, et l'arête de glacier quand c'est la
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
 * empilement sombre sur un panneau sombre n'existerait pas. **L'arête du sommet
 * s'inverse avec elles**, ce que l'accent d'avant ne faisait pas : le glacier
 * vif donne 6,94 sur la roche et 1,76 sur le papier, le profond l'inverse.
 * Aucune teinte unique ne tient les deux fonds au-dessus des trois pour un d'un
 * objet graphique — c'est la mesure qui tranche, pas le goût.
 */
const NUANCES = ["fill-stone-900", "fill-stone-800", "fill-stone-700"] as const;
const NUANCES_CLAIRES = ["fill-stone-50", "fill-stone-100", "fill-stone-300"] as const;

/**
 * Une pierre pas encore posée : le contour seul, en pointillé.
 *
 * Elle était dessinée pleine à quinze pour cent d'opacité, ce qui donnait une
 * tache pâle — un aplat qui a l'air d'une pierre ratée plutôt que d'une place
 * qui attend. Un contour interrompu dit l'emplacement sans prétendre au volume,
 * et il tient sur les deux surfaces.
 */
function Emplacement({ pierre, clair }: { pierre: Pierre; clair: boolean }) {
  return (
    <path
      d={pierre.chemin}
      fill="none"
      strokeWidth={1}
      strokeLinejoin="round"
      strokeDasharray="2.4 2.6"
      className={clair ? "stroke-stone-500" : "stroke-stone-300"}
    />
  );
}

/** Le tracé de la pierre, et l'arête de glacier sur la dernière posée. */
export function ArêtesDePierre({
  pierre,
  derniere,
  clair = false,
  aVenir = false,
}: {
  pierre: Pierre;
  derniere: boolean;
  clair?: boolean;
  /** L'emplacement d'une pierre que la session n'a pas encore posée. */
  aVenir?: boolean;
}) {
  if (aVenir) return <Emplacement pierre={pierre} clair={clair} />;

  return (
    <>
      <path d={pierre.chemin} className={(clair ? NUANCES_CLAIRES : NUANCES)[pierre.nuance]} />
      {derniere ? (
        <path
          d={pierre.chemin}
          className={clair ? "stroke-glacier" : "stroke-glacier-profond"}
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
