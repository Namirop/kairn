"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { avancementDuDepotAction } from "@/app/(app)/depots/actions";
import type { EtatDepot } from "@/lib/domain/etat-depot";
import { ABANDON_MS, AVEU_MS, pauseApres } from "@/lib/depots/rythme-de-lattente";

/**
 * Recharge le détail quand le découpage aboutit, par `router.refresh()` : le
 * rendu d'un dépôt n'existe qu'une fois, côté serveur. Mêmes bornes que l'essai :
 * au-delà de l'abandon, c'est un job perdu que le cron reprendra.
 */
export function SuivreLAvancement({
  inputId,
  etat,
  concepts,
}: {
  inputId: string;
  /** Ce que le serveur vient de rendre, la référence de chaque tour. */
  etat: EtatDepot;
  concepts: number;
}) {
  const t = useTranslations("depots.depot");
  const router = useRouter();
  const [lent, setLent] = useState(false);

  useEffect(() => {
    let vivant = true;
    let ecoule = 0;
    let minuteur: ReturnType<typeof setTimeout>;

    // Pas de `setInterval` : le rythme ralentit en route.
    const tour = async () => {
      const suite = await avancementDuDepotAction(inputId);

      if (!vivant) return;

      // Supprimé ailleurs : la page rechargée le dira.
      if (!suite) {
        router.refresh();
        return;
      }

      if (suite.etat !== etat || suite.concepts !== concepts) {
        router.refresh();
        return;
      }

      if (ecoule >= ABANDON_MS) return;
      if (ecoule >= AVEU_MS) setLent(true);

      const pause = pauseApres(ecoule);
      ecoule += pause;
      minuteur = setTimeout(() => void tour(), pause);
    };

    minuteur = setTimeout(() => void tour(), pauseApres(0));

    return () => {
      vivant = false;
      clearTimeout(minuteur);
    };
  }, [inputId, etat, concepts, router]);

  // L'état du dépôt est déjà écrit par la page.
  if (!lent) return null;

  return (
    <p className="mt-pas-3 text-petit text-stone-500" role="status">
      {t("lent")}
    </p>
  );
}
