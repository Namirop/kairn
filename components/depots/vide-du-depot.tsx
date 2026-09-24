import { AttenteDuDepot } from "@/components/depots/attente-du-depot";
import { EtatVide } from "@/components/etats/etat-vide";
import { etapeDuTravail, type EtatDepot } from "@/lib/domain/etat-depot";

/**
 * Pourquoi ce dépôt ne montre aucun concept.
 *
 * Quatre raisons, et l'écran en donnait une seule — « le découpage est en
 * cours » —, servie aussi bien à un dépôt qui travaillait qu'à un dépôt que
 * l'utilisateur venait de vider. La phrase était fausse dans trois cas sur
 * quatre, et fausse d'une façon particulièrement désagréable : elle faisait
 * attendre quelque chose qui n'arriverait jamais.
 *
 * Sur un rejet, le contexte est le motif du modèle, mot pour mot. C'est une
 * phrase écrite à la deuxième personne qui dit ce qui manquait à ce texte-là :
 * bien plus utile qu'une formule générique, et c'est ce qui apprend à mieux
 * déposer la fois suivante.
 *
 * **Deux des quatre raisons ne sont pas un vide, mais une attente**, et elles ne
 * se rendent pas pareil : un dépôt qui travaille prend la voix de l'attente,
 * celle de l'essai, plutôt qu'un constat immobile. Voir `AttenteDuDepot`. Seul
 * le contexte reste écrit ici — c'est ce qui arrive ensuite, et ça ne bouge pas.
 */
function raison(etat: EtatDepot, motif: string | null): { constat: string; contexte: string } {
  if (etat === "rejete") {
    return {
      constat: "Rien à retenir dans ce dépôt.",
      contexte: motif ?? "Ce texte ne porte pas de concept à réviser.",
    };
  }

  if (etat === "echec") {
    return {
      constat: "Le découpage s'est arrêté en chemin.",
      contexte: motif ?? "Rien n'a été écrit. Tu peux relancer le découpage sur le même texte.",
    };
  }

  if (etat === "vide") {
    return {
      constat: "Tu as supprimé les concepts de ce dépôt.",
      contexte: "Le texte, lui, est toujours là. Tu peux le redécouper, ou supprimer le dépôt.",
    };
  }

  if (etat === "lecture") {
    return {
      constat: "La capture est en cours de lecture.",
      contexte: "Le découpage suit dès que le texte en est tiré.",
    };
  }

  return {
    constat: "Aucun concept pour l'instant.",
    contexte: "Les concepts apparaissent ici dès que le découpage a fini.",
  };
}

export function VideDuDepot({
  etat,
  motif,
  graine,
}: {
  etat: EtatDepot;
  motif: string | null;
  graine: string;
}) {
  const { constat, contexte } = raison(etat, motif);
  const etape = etapeDuTravail(etat);

  if (etape) return <AttenteDuDepot etape={etape} contexte={contexte} graine={graine} />;

  return <EtatVide graine={graine} constat={constat} contexte={contexte} />;
}
