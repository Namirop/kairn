import { cibleDuVraiOuFaux } from "./vrai-ou-faux";

/**
 * Le message qui part au modèle pour faire écrire les questions d'un groupe.
 *
 * Il vivait en double — une copie dans `lib/jobs/redaction-questions.ts` pour
 * le produit, une dans `scripts/evaluation/execution.ts` pour le banc — et les
 * deux devaient déjà numéroter les concepts de la même façon, puisque c'est ce
 * rang que la sortie référence. La cible du vrai ou faux part par le même
 * chemin : un troisième champ recopié deux fois aurait fini par diverger, et le
 * banc aurait alors mesuré autre chose que ce que le produit envoie.
 *
 * La cible est **dans l'envoi et pas dans le prompt système**. C'est une
 * décision par question, elle n'a rien à faire dans un texte identique pour
 * tous les appels — et le prompt système est mis en cache, ce qui la figerait.
 */

export type ConceptAEnvoyer = {
  /**
   * De quoi dériver les tirages de ce concept : l'id de l'Atom en production,
   * le texte du concept au banc, qui n'écrit rien en base et doit pouvoir
   * comparer deux passages.
   */
  graine: string;
  concept: string;
};

/**
 * La cible, dite sans nommer de facette.
 *
 * La version précédente listait les trois facettes ouvertes au format, et cette
 * table se lisait comme une consigne d'en écrire : `TRUE_FALSE` a doublé sa part
 * du corpus en un passage. Une seule phrase, conditionnelle, qui ne désigne rien
 * et n'appelle rien.
 */
function ligneDeLaCible(graine: string): string {
  const vraie = cibleDuVraiOuFaux(graine) ? "vraie" : "fausse";

  return `Si une question de ce lot est un vrai ou faux, son affirmation doit être ${vraie}.`;
}

/** Les concepts d'un envoi, numérotés : c'est ce rang que la sortie référence. */
export function messageDuGroupe(concepts: readonly ConceptAEnvoyer[]): string {
  return concepts
    .map((entree, rang) =>
      [`Concept ${rang + 1}.`, entree.concept, ligneDeLaCible(entree.graine)].join("\n"),
    )
    .join("\n\n");
}
