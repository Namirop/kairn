import { cn } from "@/lib/fusion-des-classes";

/**
 * Une série de jours, en barres d'une seule teinte : une grandeur, pas
 * d'identités à distinguer. Le jour courant est atténué, il monte encore ; le
 * jour à zéro garde une amorce, un trou se lirait comme une interruption.
 *
 * Pas de bibliothèque : deux graphiques ne justifient ni dépendance ni rendu
 * client. La valeur exacte est dans l'infobulle native de `title`.
 */

export type PointDeSerie = {
  /** `YYYY-MM-DD`, clé et étiquette. */
  jour: string;
  valeur: number;
};

export function GraphiqueBarres({
  points,
  format,
  intitule,
  hauteur = "h-28",
}: {
  points: PointDeSerie[];
  format: (valeur: number) => string;
  /** Pour les lecteurs d'écran, à qui les barres ne disent rien. */
  intitule: string;
  hauteur?: string;
}) {
  const maximum = Math.max(...points.map((point) => point.valeur), 0);
  const dernier = points.at(-1);

  return (
    <figure className="m-0">
      <div
        className={cn("flex items-end gap-[2px]", hauteur)}
        role="img"
        aria-label={`${intitule}. ${points.map((point) => `${point.jour} : ${format(point.valeur)}`).join(", ")}`}
      >
        {points.map((point) => {
          // L'amorce de 2px sépare une valeur minuscule du zéro.
          const part = maximum === 0 ? 0 : point.valeur / maximum;
          const hauteurBarre =
            point.valeur === 0 ? "2px" : `calc(2px + ${(part * 100).toFixed(2)}%)`;

          return (
            <div key={point.jour} className="flex h-full flex-1 items-end">
              <div
                title={`${point.jour} — ${format(point.valeur)}`}
                style={{ height: hauteurBarre }}
                className={cn(
                  "w-full rounded-t-[4px]",
                  point.valeur === 0
                    ? "bg-data-mark-zero"
                    : point === dernier
                      ? "bg-data-mark/60"
                      : "bg-data-mark",
                )}
              />
            </div>
          );
        })}
      </div>

      <div className="mt-pas-2 pt-pas-2 text-mono flex justify-between border-t border-stone-300 font-mono text-stone-500">
        <span>{points[0]?.jour.slice(5)}</span>
        <span className="text-stone-900">
          {maximum === 0 ? "aucun" : `sommet ${format(maximum)}`}
        </span>
        <span>{dernier?.jour.slice(5)}</span>
      </div>
    </figure>
  );
}

/** Le titre nomme la série : une légende pour une seule série le répéterait. */
export function Carte({
  titre,
  contexte,
  children,
}: {
  titre: string;
  contexte: string;
  children: React.ReactNode;
}) {
  return (
    <section className="p-pas-6 rounded-carte border border-stone-300">
      <h3 className="text-corps font-semibold text-stone-900">{titre}</h3>
      <p className="mt-pas-1 text-petit text-stone-500">{contexte}</p>
      <div className="mt-pas-6">{children}</div>
    </section>
  );
}
