import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/fusion-des-classes";

/**
 * Quitte le flux dès qu'une valeur change : sur téléphone le bouton est deux
 * écrans plus bas, la modification partirait sans être écrite. `fixed` et non
 * `sticky` : un panneau rogne ce qui dépasse, un élément collant y reste immobile.
 */
export function BarreDEnregistrement({
  modifie,
  enCours,
  message,
  erreur,
}: {
  modifie: boolean;
  enCours: boolean;
  message?: string;
  erreur?: string;
}) {
  const t = useTranslations("compte.reglages.formulaire");

  return (
    // Place gardée quand le bouton s'en va : la page ne saute pas.
    <div className="min-h-10">
      <div
        className={cn(
          modifie &&
            "md:bottom-pas-6 md:pl-rail fixed inset-x-0 bottom-[calc(var(--barre-basse)+var(--pas-2))] z-20",
        )}
      >
        {/* Mesure et gouttière de la colonne du panneau : dans l'axe des réglages. */}
        <div className={cn(modifie && "px-pas-6 md:px-pas-8 mx-auto w-full max-w-3xl")}>
          <div
            className={cn(
              "gap-pas-4 flex flex-wrap items-center",
              modifie &&
                "px-pas-4 py-pas-3 rounded-carte bg-surface-roche grain grain-clair relative justify-between overflow-hidden text-stone-50",
            )}
          >
            {/* Le refus ici : sous le formulaire, hors de vue sur téléphone.
                Teinte de surface : un rouge sombre ne se lit pas sur la roche. */}
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

      {/* Place réservée à la réussite. Le refus va dans la barre : il laisse le
          formulaire modifié, et `!modifie` le tairait ici. */}
      <p className="mt-pas-3 text-petit min-h-5" role="status" aria-live="polite">
        {/* Répété ici pour le lecteur d'écran : c'est cette région qui est vivante. */}
        {erreur ? <span className="sr-only">{erreur}</span> : null}
        {!erreur && !modifie && message ? <span className="text-stone-500">{message}</span> : null}
      </p>
    </div>
  );
}
