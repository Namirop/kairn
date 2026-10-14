"use client";

import { useEffect, useState } from "react";
import { avancementDeLEssaiAction } from "@/app/(marketing)/actions";
import {
  etatDeLAttente,
  type EtatDeLAttente,
  pauseApres,
  RYTHME_VIF_MS,
} from "@/lib/depots/rythme-de-lattente";
import type { AvancementDeLEssai } from "@/lib/depots/essai-en-cours";

/**
 * Redemander où en est le découpage de l'essai, jusqu'à ce qu'il s'arrête.
 * Le rythme et les paliers vivent dans `rythme-de-lattente.ts`, partagés avec
 * le détail d'un dépôt.
 */
export function useAvancementDeLEssai({
  essai,
  reprend,
  depart,
}: {
  /** L'identifiant du dépôt qui vient de partir, s'il y en a un. */
  essai: string | undefined;
  /** Un découpage était déjà en route au chargement de la page. */
  reprend: boolean;
  /** Ce que le serveur avait déjà produit, lu au rendu. */
  depart: AvancementDeLEssai | null;
}) {
  const [avancement, setAvancement] = useState<AvancementDeLEssai | null>(depart);
  // Trois valeurs et non un booléen : « c'est long » demande de patienter,
  // « on a arrêté » demande un geste.
  const [attente, setAttente] = useState<EtatDeLAttente>("NORMALE");
  const [relance, setRelance] = useState(0);

  // On interroge aussi quand la page se charge sur un découpage déjà en route :
  // après un rechargement, aucune action ne revient pour lancer la boucle.
  const aPoursuivre = Boolean(essai) || reprend;

  useEffect(() => {
    if (!aPoursuivre) return;

    let vivant = true;
    let ecoule = RYTHME_VIF_MS;
    let minuteur: ReturnType<typeof setTimeout>;

    // Un enchaînement de délais plutôt qu'un intervalle : le rythme change en
    // cours de route, et un `setInterval` ne sait pas ralentir.
    const tour = async () => {
      const suite = await avancementDeLEssaiAction();

      if (!vivant) return;

      setAvancement(suite);

      if (!suite?.enCours) return;

      const ou = etatDeLAttente(ecoule);

      setAttente(ou);

      // On s'arrête là, et l'écran le dit : au-delà, ce n'est plus une
      // extraction lente mais un job reporté que le cron reprendra.
      if (ou === "ABANDONNEE") return;

      const pause = pauseApres(ecoule);

      ecoule += pause;
      minuteur = setTimeout(tour, pause);
    };

    minuteur = setTimeout(tour, RYTHME_VIF_MS);

    return () => {
      vivant = false;
      clearTimeout(minuteur);
    };
    // `essai` et non la session : deux essais d'une même visite partagent la
    // session, et l'effet ne serait pas rejoué pour le second.
  }, [essai, aPoursuivre, relance]);

  return {
    avancement,
    attente,
    /** Un dépôt vient de partir : on oublie le verdict du précédent. */
    repartirDeZero: () => {
      setAttente("NORMALE");
      setAvancement(null);
    },
    /**
     * Reprend l'interrogation pour un tour complet, après qu'elle a renoncé. La
     * minute repart de zéro : c'est un geste volontaire, pas une reprise
     * automatique.
     */
    verifierANouveau: () => {
      setAttente("NORMALE");
      setRelance((tour) => tour + 1);
    },
  };
}
