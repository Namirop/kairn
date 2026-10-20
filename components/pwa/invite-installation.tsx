"use client";

import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { SymboleDeMarque } from "@/components/coquille/symbole-de-marque";
import { Button } from "@/components/ui/button";
import { GesteManuel } from "./gestes-manuels";
import { useInstallation } from "./use-installation";

/**
 * Dans la page sur téléphone (flottante, elle couvrirait la navigation basse) ;
 * flottante sur grand écran, pour ne pas couper le tableau de bord. La
 * pastille a la forme d'une icône d'écran d'accueil : elle montre ce qui se posera.
 */
export function InviteInstallation() {
  const { mode, installer, ecarter, confirmer } = useInstallation();
  const t = useTranslations("tableau.commun.installation");

  if (mode === "aucune") return null;

  return (
    // L'écart est porté ici : le bloc souvent absent, une marge du parent ferait un trou.
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

          {/* Pas d'`appinstalled` aux gestes manuels, et sur iPhone l'app a un
              bac à sable invisible de Safari : seule la personne sait que c'est
              fait. Un constat, pas « Terminer », qui ferait croire qu'il installe. */}
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
