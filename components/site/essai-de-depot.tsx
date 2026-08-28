"use client";

import { useActionState, useEffect, useState } from "react";
import { avancementDeLEssaiAction, essayerAction, type EtatEssai } from "@/app/(marketing)/actions";
import { FormulaireDEssai } from "@/components/site/formulaire-dessai";
import { ResultatDeLEssai } from "@/components/site/resultat-de-lessai";
import { ABANDON_MS, AVEU_MS, pauseApres, RYTHME_VIF_MS } from "@/lib/depots/rythme-de-lattente";
import type { AvancementDeLEssai } from "@/lib/depots/essai-en-cours";

/**
 * L'essai, sur la landing : on dépose, et les concepts arrivent pour de vrai.
 *
 * C'est le cœur de la conversion, et la raison de tout le mécanisme de session
 * anonyme derrière. Montrer le découpage convainc ; le promettre fait fermer
 * l'onglet. Le compte n'est demandé qu'après, pour garder ce qu'on vient de voir
 * apparaître — à ce moment-là, on sait ce qu'on garde.
 *
 * Ce fichier n'est plus que l'aiguillage et l'attente : le formulaire vit dans
 * `FormulaireDEssai`, le résultat dans `ResultatDeLEssai`, et ce sont deux
 * écrans qui ne partagent ni composition ni largeur.
 *
 * L'extraction est asynchrone, donc l'écran redemande où elle en est. C'est le
 * seul endroit du produit qui interroge en boucle, et il s'arrête dès que la
 * chaîne s'est arrêtée.
 */
export function EssaiDeDepot({
  invite,
  essaiPrecedent,
}: {
  invite: string;
  /** Ce qu'une visite antérieure a déjà produit. Lu côté serveur au chargement. */
  essaiPrecedent: AvancementDeLEssai | null;
}) {
  const [etat, action, enCours] = useActionState<EtatEssai, FormData>(essayerAction, {});
  const [avancement, setAvancement] = useState<AvancementDeLEssai | null>(essaiPrecedent);
  // Rouvre le champ sur un essai déjà rendu. La base tranchera : elle accorde
  // deux essais par tranche de vingt-quatre heures, quoi qu'ils aient donné.
  const [recommence, setRecommence] = useState(false);
  // L'interrogation s'est arrêtée sans résultat. Un état à part et non l'absence
  // d'intervalle : c'est ce que l'écran doit dire, et il faut qu'il le sache.
  const [attenteInterrompue, setAttenteInterrompue] = useState(false);
  const [relance, setRelance] = useState(0);
  const [dernierEssai, setDernierEssai] = useState<string | null>(null);

  // Un essai vient de partir : l'écran repart de zéro.
  //
  // Ajusté pendant le rendu plutôt que dans un effet, parce qu'un effet aurait
  // laissé une image afficher le verdict du **premier** essai — « ce texte n'a
  // rien donné » sur un dépôt qui vient tout juste d'être envoyé. React
  // recommence le rendu sans rien poser à l'écran entre les deux.
  //
  // `recommence` en particulier n'était jamais remis à faux nulle part : une
  // fois « Réessayer » cliqué, le composant rendait le formulaire pour toujours
  // et le second essai, qui avait bien tourné et bien coûté, ne s'affichait
  // jamais.
  if (etat.inputId && etat.inputId !== dernierEssai) {
    setDernierEssai(etat.inputId);
    setRecommence(false);
    setAttenteInterrompue(false);
    setAvancement(null);
  }

  // On interroge aussi quand la page se charge sur un découpage déjà en route.
  // Sans ça, un rechargement pendant l'extraction figeait l'écran sur l'attente :
  // l'intervalle ne démarrait qu'au retour de l'action, et il n'y en avait pas.
  const aPoursuivre = Boolean(etat.inputId) || Boolean(essaiPrecedent?.enCours);

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
      if (ecoule >= AVEU_MS) setAttenteInterrompue(true);
      if (ecoule >= ABANDON_MS) return;

      const pause = pauseApres(ecoule);

      ecoule += pause;
      minuteur = setTimeout(tour, pause);
    };

    minuteur = setTimeout(tour, RYTHME_VIF_MS);

    return () => {
      vivant = false;
      clearTimeout(minuteur);
    };
    // `etat.inputId` et non la session : deux essais d'une même visite portent
    // la même session, la dépendance ne changeait donc pas de valeur et l'effet
    // n'était jamais rejoué. L'écran restait sur l'avancement du premier.
  }, [etat.inputId, aPoursuivre, relance]);

  // Reprend l'interrogation pour un tour complet. La minute est repartie de
  // zéro : c'est un geste volontaire, pas une reprise automatique.
  const verifierANouveau = () => {
    setAttenteInterrompue(false);
    setRelance((tour) => tour + 1);
  };

  // L'attente commence au clic et non au retour de l'action : entre les deux
  // il y a un aller-retour, et pendant cet aller-retour seul le libellé du
  // bouton changeait — l'écran avait l'air de n'avoir rien reçu. `enCours` est
  // donc en tête et hors du `!recommence` : un second essai part depuis le
  // formulaire, et sans ça il n'aurait pas eu droit à cette attente-là.
  //
  // Un essai déjà fait se remontre plutôt que de laisser un champ vide : sinon
  // le refus d'un essai de plus désigne des concepts que personne ne voit.
  if (enCours || (!recommence && (etat.sessionId || essaiPrecedent))) {
    return (
      <ResultatDeLEssai
        // Un dépôt en vol efface le verdict du précédent. Sans ça, le temps de
        // l'aller-retour, l'écran affiche « ce texte n'a rien donné » à propos
        // d'un texte qu'on vient d'envoyer.
        avancement={enCours ? null : avancement}
        setRecommence={setRecommence}
        attenteInterrompue={attenteInterrompue}
        onVerifier={verifierANouveau}
      />
    );
  }

  return (
    <FormulaireDEssai
      invite={invite}
      action={action}
      enCours={enCours}
      erreurServeur={etat.erreur}
      // Le champ se rouvre sur un découpage qui a abouti : on le dit, sinon on
      // laisse croire qu'on remplace ce qu'on vient de montrer.
      reprise={recommence && (avancement?.concepts.length ?? 0) > 0}
    />
  );
}
