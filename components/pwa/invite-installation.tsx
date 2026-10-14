"use client";

import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { SymboleDeMarque } from "@/components/coquille/symbole-de-marque";
import { Button } from "@/components/ui/button";
import { GesteManuel } from "./gestes-manuels";
import { useInstallation } from "./use-installation";

/**
 * L'invite à poser Kairn sur l'écran d'accueil.
 *
 * Sur téléphone elle est dans la page : flottante, elle couvrirait la
 * navigation basse et suivrait pendant la session. Sur grand écran elle flotte
 * en bas à droite, pour ne pas couper le tableau de bord sous le compteur du
 * jour. La pastille a la taille et l'arrondi d'une icône d'écran d'accueil :
 * elle montre ce qui se posera.
 */
export function InviteInstallation() {
  const { mode, installer, ecarter, confirmer } = useInstallation();
  const t = useTranslations("tableau.commun.installation");

  if (mode === "aucune") return null;

  return (
    // L'écart au-dessus est porté ici et non par la page : le bloc est le plus
    // souvent absent, et une marge sur le parent laisserait un trou vide.
    <aside className="mt-pas-8 rounded-carte bg-surface-ombre p-pas-6 md:right-pas-6 md:bottom-pas-6 relative text-left md:fixed md:z-30 md:mt-0 md:w-[22rem]">
      <button
        type="button"
        onClick={ecarter}
        aria-label={t("ecarter")}
        className="top-pas-3 right-pas-3 p-pas-1 rounded-galet hover:bg-surface-papier absolute text-stone-500 transition-colors hover:text-stone-900"
      >
        <X className="size-4" />
      </button>

      <div className="gap-pas-4 flex items-start">
        <span
          aria-hidden
          className="bg-surface-papier rounded-champ flex size-12 shrink-0 items-center justify-center"
        >
          <SymboleDeMarque pierres={3} taille={26} />
        </span>

        <div className="pr-pas-6 min-w-0 flex-1">
          <p className="font-medium">{t("titre")}</p>
          <p className="mt-pas-1 text-petit text-stone-500">{t("texte")}</p>
        </div>
      </div>

      {mode === "automatique" ? (
        <Button className="mt-pas-4" onClick={installer}>
          {t("installer")}
        </Button>
      ) : (
        <>
          <GesteManuel geste={mode} />

          {/* Les gestes manuels n'émettent pas `appinstalled`, et sur iPhone
              l'application installée a son propre bac à sable, invisible depuis
              Safari : la personne est le seul moyen de savoir que c'est fait.
              Libellé de constat, pas « Terminer », qui laisserait croire que le
              bouton installe. */}
          <button
            type="button"
            onClick={confirmer}
            className="mt-pas-4 text-petit rounded-xs text-stone-900 underline decoration-stone-300 underline-offset-4 transition-colors hover:decoration-stone-900"
          >
            {t("cestFait")}
          </button>
        </>
      )}
    </aside>
  );
}
