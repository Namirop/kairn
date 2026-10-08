import { useTranslations } from "next-intl";
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
type Raison = "rejete" | "echec" | "vide" | "lecture" | "attente";

function raison(etat: EtatDepot): Raison {
  if (etat === "rejete" || etat === "echec" || etat === "vide" || etat === "lecture") return etat;

  return "attente";
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
  const t = useTranslations("depots.depot.vide");
  const cle = raison(etat);
  const constat = t(`${cle}.constat`);
  // Le motif du modèle, quand il y en a un, passe avant la phrase générique —
  // sur un rejet ou une panne seulement.
  const contexte = (cle === "rejete" || cle === "echec" ? motif : null) ?? t(`${cle}.contexte`);
  const etape = etapeDuTravail(etat);

  if (etape) return <AttenteDuDepot etape={etape} contexte={contexte} graine={graine} />;

  return <EtatVide graine={graine} constat={constat} contexte={contexte} />;
}
