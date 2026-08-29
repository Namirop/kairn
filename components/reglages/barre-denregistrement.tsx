import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Le bouton qui écrit les réglages, et l'état de ce qui ne l'est pas encore.
 *
 * **Il quitte le flux dès qu'une valeur change, et seulement alors.** C'est ce
 * qui manquait : sur un téléphone, le nombre de concepts est en haut du
 * formulaire et le bouton deux écrans plus bas, hors de vue. On changeait la
 * valeur, on repartait — et rien n'avait été écrit. Rien ne le disait non plus,
 * puisque le seul objet qui l'aurait dit était justement celui qu'on ne voyait
 * pas.
 *
 * Une barre qui apparaît au premier changement dit les deux choses d'un coup :
 * que quelque chose attend, et où l'enregistrer. Au repos elle reste en bas du
 * formulaire, à sa place — collée en permanence, elle occuperait la zone du
 * pouce pour n'annoncer rien.
 *
 * Elle est posée `fixed` et non `sticky`, parce qu'un panneau rogne ce qui
 * dépasse de lui : un élément collant y reste immobile, et ça ne se voit qu'à
 * l'essai. Fixée, elle suit aussi la personne au-delà du formulaire, jusqu'aux
 * gestes de compte — c'est là qu'on s'en va avec une modification en attente.
 *
 * Elle se range au-dessus de la navigation basse et à droite du rail de bureau,
 * sinon elle passerait sous l'une ou par-dessus l'autre.
 */
export function BarreDEnregistrement({
  modifie,
  enCours,
  message,
  erreur,
}: {
  /** Une valeur a changé et n'est pas encore écrite. */
  modifie: boolean;
  enCours: boolean;
  message?: string;
  erreur?: string;
}) {
  return (
    // La place du bouton reste prise quand il s'en va. Sans ce creux, le bas du
    // formulaire remonterait d'un cran au moment même où l'on touche à une
    // valeur : la page sauterait pour dire qu'elle a compris.
    <div className="min-h-10">
      <div
        className={cn(
          modifie &&
            "md:bottom-pas-6 fixed inset-x-0 bottom-[calc(var(--barre-basse)+var(--pas-2))] z-20 md:pl-28",
        )}
      >
        {/* La mesure et la gouttière sont celles de la colonne du panneau : la
            barre se pose dans l'axe des réglages qu'elle enregistre. */}
        <div className={cn(modifie && "px-pas-6 md:px-pas-8 mx-auto w-full max-w-3xl")}>
          <div
            className={cn(
              "gap-pas-4 flex flex-wrap items-center",
              modifie &&
                "px-pas-4 py-pas-3 rounded-carte bg-surface-roche grain grain-clair relative justify-between overflow-hidden text-stone-50",
            )}
          >
            <p className={cn("text-petit relative z-10", modifie ? "text-stone-300" : "sr-only")}>
              Modifié, pas encore enregistré
            </p>

            <Button
              type="submit"
              disabled={enCours}
              className={cn(
                "relative z-10",
                modifie && "bg-stone-50 text-stone-900 hover:bg-stone-300",
              )}
            >
              {enCours ? "Un instant" : "Enregistrer"}
            </Button>
          </div>
        </div>
      </div>

      {/* L'espace du message est réservé : il ne fait pas sauter la page.

          **Le refus s'affiche toujours, la réussite non.** Les deux étaient
          tenus par la même condition, et le refus n'apparaissait donc jamais :
          une saisie rejetée laisse le formulaire modifié — c'est même sa
          définition —, et la barre effaçait le seul message capable de dire
          quoi corriger. On tapait 60 concepts par session, le champ se
          soulignait en rouge, et rien n'expliquait que le maximum est 50.

          « Enregistré. », lui, se tait dès qu'une modification attend : il
          resterait d'une écriture précédente et dirait le contraire de la
          barre. */}
      <p className="mt-pas-3 text-petit min-h-5" role="status" aria-live="polite">
        {erreur ? <span className="text-alerte">{erreur}</span> : null}
        {!erreur && !modifie && message ? (
          <span className="text-stone-500">{message}</span>
        ) : null}
      </p>
    </div>
  );
}
