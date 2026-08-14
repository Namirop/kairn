import { ciblesDuLot } from "./vrai-ou-faux";

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

/** « recognition : vraie · boundary : fausse · application : vraie » */
function ligneDesCibles(graine: string): string {
  const cibles = ciblesDuLot(graine)
    .map(({ facette, vraie }) => `${facette} : ${vraie ? "vraie" : "fausse"}`)
    .join(" · ");

  return `Si tu écris un TRUE_FALSE sur ces facettes, l'affirmation doit être — ${cibles}`;
}

/** Les concepts d'un envoi, numérotés : c'est ce rang que la sortie référence. */
export function messageDuGroupe(concepts: readonly ConceptAEnvoyer[]): string {
  return concepts
    .map((entree, rang) =>
      [`Concept ${rang + 1}.`, entree.concept, ligneDesCibles(entree.graine)].join("\n"),
    )
    .join("\n\n");
}
