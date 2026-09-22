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
 * Redemander où en est le découpage, jusqu'à ce qu'il s'arrête.
 *
 * C'est le seul endroit du produit qui interroge en boucle. L'extraction est
 * asynchrone — l'ingestion écrit un job et rend la main —, donc l'écran n'a pas
 * d'autre moyen de savoir. Le rythme et les paliers vivent dans
 * `rythme-de-lattente.ts`, partagés avec le détail d'un dépôt : deux cadences
 * qui doivent être égales et qui vivraient à deux endroits finiraient par
 * diverger.
 *
 * Extrait de `EssaiDeDepot` parce que ce sont deux rôles : celui-ci sait quand
 * redemander et quand renoncer, l'autre sait quoi montrer. Le second a grandi
 * en gagnant la fenêtre, et le fichier est passé au-dessus du plafond de deux
 * cents lignes — ce qui était le signal qu'il en faisait deux.
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
  // Depuis combien de temps on attend, et si l'on cherche encore. Un état à
  // part et non l'absence d'intervalle : c'est ce que l'écran doit dire, et il
  // faut qu'il le sache. Trois valeurs et non un booléen, parce que « c'est
  // long » et « on a arrêté » ne se disent pas de la même façon — le premier
  // demande de patienter, le second demande un geste.
  const [attente, setAttente] = useState<EtatDeLAttente>("NORMALE");
  const [relance, setRelance] = useState(0);

  // On interroge aussi quand la page se charge sur un découpage déjà en route.
  // Sans ça, un rechargement pendant l'extraction figeait l'écran sur l'attente :
  // l'intervalle ne démarrait qu'au retour de l'action, et il n'y en avait pas.
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
    // `essai` et non la session : deux essais d'une même visite portent la même
    // session, la dépendance ne changeait donc pas de valeur et l'effet n'était
    // jamais rejoué. L'écran restait sur l'avancement du premier.
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
