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
 * Il fallait rafraîchir à la main pour voir ses concepts arriver, sur le seul
 * écran où l'on va justement pour les attendre. La landing savait déjà le faire
 * pour l'essai ; c'était le même besoin, à un écran près.
 *
 * **Il ne rend rien lui-même, il recharge la page.** L'alternative aurait été de
 * lui faire afficher les concepts à mesure, et il aurait alors fallu tenir deux
 * fois le rendu d'un dépôt : une fois côté serveur pour l'arrivée sur la page,
 * une fois ici pour la mise à jour. `router.refresh()` rejoue le composant
 * serveur avec des données fraîches — un seul rendu, celui qui existe déjà.
 *
 * **Il n'interroge que ce qui bouge.** L'état de la chaîne et le nombre de
 * concepts, jamais le texte ni les questions. Tant que ces deux valeurs sont
 * celles qu'on a servies, il n'y a rien à recharger, et le tour n'aura coûté
 * qu'une requête.
 *
 * **Il s'arrête**, aux mêmes bornes que l'essai (voir `rythme-de-lattente`) :
 * il ralentit à quinze secondes et renonce à quatre-vingt-dix, où ce n'est plus
 * une extraction lente mais un job perdu que le cron reprendra. Un écran qui
 * interroge pour l'éternité est un onglet qui chauffe dans une poche.
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

      // Le dépôt a disparu sous nos pieds — supprimé dans un autre onglet. La
      // page s'en rendra compte mieux que nous en se rechargeant.
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

  // Le seul moment où ce composant a quelque chose à dire : l'attente dure plus
  // que d'habitude. Le reste du temps il travaille sans se montrer, et l'état
  // du dépôt est déjà écrit au-dessus par la page.
  if (!lent) return null;

  return (
    <p className="mt-pas-3 text-petit text-stone-500" role="status">
      {t("lent")}
    </p>
  );
}
