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

/** Redemande où en est le découpage de l'essai, au rythme de `rythme-de-lattente.ts`. */
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
  const [attente, setAttente] = useState<EtatDeLAttente>("NORMALE");
  const [relance, setRelance] = useState(0);

  // Après un rechargement, aucune action ne revient lancer la boucle.
  const aPoursuivre = Boolean(essai) || reprend;

  useEffect(() => {
    if (!aPoursuivre) return;

    let vivant = true;
    let ecoule = RYTHME_VIF_MS;
    let minuteur: ReturnType<typeof setTimeout>;

    // Des délais enchaînés : le rythme ralentit, ce que `setInterval` ne sait pas.
    const tour = async () => {
      const suite = await avancementDeLEssaiAction();

      if (!vivant) return;

      setAvancement(suite);

      if (!suite?.enCours) return;

      const ou = etatDeLAttente(ecoule);

      setAttente(ou);

      // Au-delà, c'est un job reporté que le cron reprendra.
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
    // `essai` et non la session, partagée par deux essais d'une même visite.
  }, [essai, aPoursuivre, relance]);

  return {
    avancement,
    attente,
    /** Un dépôt part : on oublie le verdict du précédent. */
    repartirDeZero: () => {
      setAttente("NORMALE");
      setAvancement(null);
    },
    /** Après abandon, relance un tour complet : le compte des 90 s repart de zéro. */
    verifierANouveau: () => {
      setAttente("NORMALE");
      setRelance((tour) => tour + 1);
    },
  };
}
