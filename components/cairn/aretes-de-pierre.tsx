import type { Pierre } from "@/lib/domain/cairn-empilement";

/**
 * Sans Motion, contrairement à `pierre-posee.tsx` : un état vide ou un compteur
 * de session ne l'embarquent pas pour ne jamais bouger.
 */

const NUANCES = ["fill-stone-900", "fill-stone-800", "fill-stone-700"] as const;
const NUANCES_CLAIRES = ["fill-stone-50", "fill-stone-100", "fill-stone-300"] as const;

/** Le contour seul : l'emplacement, sans prétendre au volume. */
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
