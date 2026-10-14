"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { avancementDuDepotAction } from "@/app/(app)/depots/actions";
import type { EtatDepot } from "@/lib/domain/etat-depot";
import { ABANDON_MS, AVEU_MS, pauseApres } from "@/lib/depots/rythme-de-lattente";

/**
 * L'écran de détail se recharge tout seul quand le découpage aboutit.
 *
 * Il ne rend rien lui-même : `router.refresh()` rejoue le composant serveur,
 * pour ne pas tenir deux fois le rendu d'un dépôt. Il n'interroge que l'état et
 * le nombre de concepts ; tant qu'ils n'ont pas bougé, un tour ne coûte qu'une
 * requête.
 *
 * Il s'arrête aux mêmes bornes que l'essai (`rythme-de-lattente`) : il avoue la
 * lenteur à 15 s et renonce à 90 s, où c'est un job perdu que le cron
 * reprendra, plus une extraction lente.
 */
export function SuivreLAvancement({
  inputId,
  etat,
  concepts,
}: {
  inputId: string;
  /** Ce que le serveur vient de rendre. Le tour compare à ça. */
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

    // Un enchaînement de délais plutôt qu'un intervalle : le rythme ralentit en
    // cours de route, et un `setInterval` ne sait pas ralentir.
    const tour = async () => {
      const suite = await avancementDuDepotAction(inputId);

      if (!vivant) return;

      // Dépôt supprimé ailleurs (un autre onglet) : la page rechargée le dira.
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

  // Il ne se montre que si l'attente s'allonge : l'état du dépôt est déjà
  // écrit par la page.
  if (!lent) return null;

  return (
    <p className="mt-pas-3 text-petit text-stone-500" role="status">
      {t("lent")}
    </p>
  );
}
