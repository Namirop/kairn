import { cibleDuVraiOuFaux } from "./vrai-ou-faux";

/**
 * Le message qui part au modèle pour faire écrire les questions d'un groupe.
 *
 * Partagé par le produit (`lib/jobs/redaction-questions.ts`) et le banc
 * (`scripts/evaluation/`) : la sortie référence le rang des concepts, et le banc
 * doit mesurer exactement ce que le produit envoie.
 *
 * La cible du vrai ou faux est dans l'envoi et non dans le prompt système :
 * c'est une décision par question, et le prompt système est mis en cache.
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
 * La cible, dite sans nommer de facette : une liste de facettes se lisait comme
 * une consigne d'écrire des vrai ou faux, et leur part doublait.
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
