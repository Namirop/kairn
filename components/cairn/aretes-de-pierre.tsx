import type { Pierre } from "@/lib/domain/cairn-empilement";

/**
 * Le tracé d'une pierre : sa forme, et l'arête de lichen quand c'est la
 * dernière posée.
 *
 * Sans dépendance d'animation, contrairement à `pierre-posee.tsx` : un état
 * vide ou un compteur de session n'embarquent pas Motion pour ne jamais bouger.
 */

/** Les nuances d'une pierre : claires sur la roche, sombres sur le papier. */
const NUANCES = ["fill-stone-900", "fill-stone-800", "fill-stone-700"] as const;
const NUANCES_CLAIRES = ["fill-stone-50", "fill-stone-100", "fill-stone-300"] as const;

/**
 * Une pierre pas encore posée : le contour seul, en pointillé, qui dit
 * l'emplacement sans prétendre au volume.
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

/** Le tracé de la pierre, et l'arête de lichen sur la dernière posée. */
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
