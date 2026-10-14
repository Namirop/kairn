import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/fusion-des-classes";

/**
 * Le bouton qui écrit les réglages, et l'état de ce qui ne l'est pas encore.
 *
 * Il quitte le flux dès qu'une valeur change, et seulement alors : sur un
 * téléphone, le bouton est deux écrans sous le premier réglage, et une
 * modification partirait sans être écrite. Au repos, il reste à sa place.
 *
 * `fixed` et non `sticky` : un panneau rogne ce qui dépasse de lui, et un
 * élément collant y reste immobile. Elle se range au-dessus de la navigation
 * basse et à droite du rail de bureau.
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
  const t = useTranslations("compte.reglages.formulaire");

  return (
    // La place du bouton reste prise quand il s'en va, sinon la page sauterait
    // au premier changement.
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
            {/* Le refus se dit dans la barre, à côté du bouton, et remplace
                « modifié » : sous le formulaire, il serait hors de vue sur un
                téléphone. Teinte de la surface d'alerte et non de l'encre : sur
                la roche, un rouge sombre ne se lit pas. */}
            <p
              className={cn(
                "text-petit relative z-10",
                modifie ? (erreur ? "text-alerte-surface" : "text-stone-300") : "sr-only",
              )}
            >
              {erreur ?? t("modifie")}
            </p>

            <Button
              type="submit"
              disabled={enCours}
              className={cn(
                "relative z-10",
                modifie && "bg-stone-50 text-stone-900 hover:bg-stone-300",
              )}
            >
              {enCours ? t("unInstant") : t("enregistrer")}
            </Button>
          </div>
        </div>
      </div>

      {/* L'espace de la réussite est réservé : elle ne fait pas sauter la page.
          Le refus, lui, est dans la barre — un refus laisse le formulaire
          modifié, et la condition `!modifie` le tairait ici. */}
      <p className="mt-pas-3 text-petit min-h-5" role="status" aria-live="polite">
        {/* Le refus est en vue dans la barre, mais c'est cette région-ci qui est
            vivante : il y est répété pour les lecteurs d'écran, hors de la vue. */}
        {erreur ? <span className="sr-only">{erreur}</span> : null}
        {!erreur && !modifie && message ? <span className="text-stone-500">{message}</span> : null}
      </p>
    </div>
  );
}
