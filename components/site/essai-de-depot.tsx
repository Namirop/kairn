"use client";

import { useActionState, useState } from "react";
import { essayerAction, type EtatEssai } from "@/app/(marketing)/actions";
import { EssaiRepris } from "@/components/site/essai-repris";
import { FenetreDeLEssai } from "@/components/site/fenetre-de-lessai";
import { FormulaireDEssai } from "@/components/site/formulaire-dessai";
import { GarderLesConcepts } from "@/components/site/garder-les-concepts";
import { ResultatDeLEssai } from "@/components/site/resultat-de-lessai";
import { useAvancementDeLEssai } from "@/components/site/use-avancement-de-lessai";
import type { AvancementDeLEssai } from "@/lib/depots/essai-en-cours";

/**
 * L'essai, sur la landing : on dépose sans compte, et les concepts arrivent pour
 * de vrai. Le compte n'est demandé qu'après, pour garder ce qu'on a vu.
 *
 * La bande rend le formulaire ou le rappel d'un essai ; le reste se joue dans
 * `FenetreDeLEssai`.
 *
 * La fenêtre s'ouvre sur le geste (`surDepot`, après les refus de longueur du
 * formulaire), pas dans un effet sur `enCours` : un effet la rouvrirait au rendu
 * suivant si le visiteur l'avait fermée pendant le découpage. Au chargement,
 * elle ne s'ouvre que sur un découpage encore en route.
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
  // Rouvre le champ sur un essai déjà rendu. La base tranchera : elle accorde
  // deux essais par tranche de vingt-quatre heures, quoi qu'ils aient donné.
  const [recommence, setRecommence] = useState(false);
  const [dernierEssai, setDernierEssai] = useState<string | null>(null);
  // Ouverte d'emblée sur un découpage déjà en route, et sur rien d'autre.
  const [fenetreOuverte, setFenetreOuverte] = useState(() => Boolean(essaiPrecedent?.enCours));
  const [rendreLeFocus, setRendreLeFocus] = useState(false);

  const { avancement, attente, repartirDeZero, verifierANouveau } = useAvancementDeLEssai({
    essai: etat.inputId,
    reprend: Boolean(essaiPrecedent?.enCours),
    depart: essaiPrecedent,
  });

  // Un essai vient de partir : l'écran repart de zéro, et `recommence` retombe
  // (sinon le formulaire masquerait le second essai pour toujours). Ajusté
  // pendant le rendu et non dans un effet, qui laisserait passer une image avec
  // le verdict de l'essai précédent.
  if (etat.inputId && etat.inputId !== dernierEssai) {
    setDernierEssai(etat.inputId);
    setRecommence(false);
    repartirDeZero();
  }

  // Le rappel remplace la fenêtre qu'on vient de fermer, et le clavier le suit.
  const fermerLaFenetre = () => {
    setFenetreOuverte(false);
    setRendreLeFocus(true);
  };

  const redeposer = () => {
    setFenetreOuverte(false);
    setRendreLeFocus(false);
    setRecommence(true);
  };

  // Un dépôt en vol masque le verdict du précédent, le temps de l'aller-retour.
  const montre = enCours ? null : avancement;
  const concepts = montre?.concepts ?? [];
  // Le rappel ne vaut que pour un essai qui a produit quelque chose. Un échec
  // n'a rien à rappeler : ce qu'il faut offrir alors, c'est le champ.
  const rappel = !recommence && concepts.length > 0;

  return (
    <>
      {rappel ? (
        <EssaiRepris
          concepts={concepts.map((concept) => concept.id)}
          peutRedeposer={montre?.peutRedeposer ?? false}
          chaineFinie={montre !== null && !montre.enCours}
          surRevoir={() => setFenetreOuverte(true)}
          surRedepot={redeposer}
          prendLeFocus={rendreLeFocus}
        />
      ) : (
        <FormulaireDEssai
          invite={invite}
          action={action}
          enCours={enCours}
          erreurServeur={etat.erreur}
          surDepot={() => {
            setFenetreOuverte(true);
            setRendreLeFocus(false);
          }}
          // Le champ se rouvre sur un découpage qui a abouti : on le dit, sinon on
          // laisse croire qu'on remplace ce qu'on vient de montrer.
          reprise={recommence && (avancement?.concepts.length ?? 0) > 0}
        />
      )}

      <FenetreDeLEssai
        ouverte={fenetreOuverte}
        surFermeture={fermerLaFenetre}
        pied={
          concepts.length > 0 ? (
            <GarderLesConcepts
              peutRedeposer={montre?.peutRedeposer ?? false}
              chaineFinie={montre !== null && !montre.enCours}
              surRedepot={redeposer}
            />
          ) : undefined
        }
      >
        <ResultatDeLEssai
          avancement={montre}
          surRedepot={redeposer}
          attente={attente}
          onVerifier={verifierANouveau}
        />
      </FenetreDeLEssai>
    </>
  );
}
