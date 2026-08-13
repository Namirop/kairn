import { cn } from "@/lib/utils";

/**
 * Une série de jours, en barres.
 *
 * Une seule teinte, et pas de palette : toutes les séries de cet écran mesurent
 * une **grandeur** — des dollars, des concepts, des appels. Une grandeur n'a pas
 * d'identité à distinguer, donc peindre chaque barre d'une couleur différente
 * n'encoderait rien et se lirait comme une information qui n'existe pas. La
 * couleur ne revient qu'une fois, sur la barre du jour courant, parce que celle-
 * là dit quelque chose : elle est encore en train de monter.
 *
 * Le jour à zéro garde une amorce grise plutôt que rien. C'est la même raison
 * qui fait engendrer les jours par la base : une série qui laisse un trou là où
 * il ne s'est rien passé se lit comme une série interrompue.
 *
 * Pas de bibliothèque. Deux graphiques ne justifient pas une dépendance, et
 * celle-ci arriverait avec son propre moteur de rendu client sur un écran qui
 * n'a aucune raison d'être autre chose que du HTML rendu au serveur. L'infobulle
 * native de `title` porte la valeur exacte ; l'axe porte les repères.
 */

export type PointDeSerie = {
  /** L'abscisse, en `YYYY-MM-DD`. Sert de clé et d'étiquette. */
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
  /** Ce qu'on écrit dans l'infobulle et sur le sommet. */
  format: (valeur: number) => string;
  /** Nommé pour les lecteurs d'écran : le graphique n'est pas décrit par ses barres. */
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
          // Le zéro garde deux pixels d'amorce ; le reste se répartit sur ce
          // qui dépasse, pour qu'une valeur minuscule reste distincte du vide.
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

/**
 * Un graphique et son titre, tels qu'ils se posent sur la synthèse.
 *
 * Le titre nomme la série, ce qui dispense de légende : une légende pour une
 * seule série répète le titre à côté d'un carré de couleur.
 */
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
