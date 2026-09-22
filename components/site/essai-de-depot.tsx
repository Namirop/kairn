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
 * L'essai, sur la landing : on dépose, et les concepts arrivent pour de vrai.
 *
 * C'est le cœur de la conversion, et la raison de tout le mécanisme de session
 * anonyme derrière. Montrer le découpage convainc ; le promettre fait fermer
 * l'onglet. Le compte n'est demandé qu'après, pour garder ce qu'on vient de voir
 * apparaître — à ce moment-là, on sait ce qu'on garde.
 *
 * **Ce fichier est l'aiguillage, l'attente, et depuis peu l'ouverture de la
 * fenêtre.** La bande ne rend plus que deux choses — le formulaire, ou le rappel
 * de ce qu'un essai a donné — et tout le reste se joue dans `FenetreDeLEssai`.
 * La bande devait être quatre mises en page à elle seule, et aucune ne pouvait
 * être bien composée ; elle n'en a plus qu'une par état, et les deux ont la même
 * charpente.
 *
 * **La fenêtre s'ouvre sur le geste, pas sur un effet.** C'est le formulaire qui
 * le dit, au moment où il envoie vraiment — après ses propres refus de longueur.
 * Ouvrir depuis un effet monté sur `enCours` aurait demandé de retenir que le
 * visiteur l'avait fermée, faute de quoi elle se serait rouverte au rendu
 * suivant, pendant que le découpage tournait encore.
 *
 * **Elle s'ouvre aussi au chargement d'un découpage déjà en route**, et
 * seulement dans ce cas. Quelqu'un qui recharge la page pendant l'extraction
 * était au milieu d'un geste : le lui rendre n'est pas une interruption. Un
 * essai déjà abouti, lui, n'ouvre rien — on trouve son rappel dans la bande, et
 * on rouvre si on veut.
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

  /*
    Un dépôt en vol efface le verdict du précédent. Sans ça, le temps de
    l'aller-retour, la fenêtre affiche « ce texte n'a rien donné » à propos d'un
    texte qu'on vient d'envoyer.
  */
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
