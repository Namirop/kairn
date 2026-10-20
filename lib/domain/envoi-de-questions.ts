import { cibleDuVraiOuFaux } from "./vrai-ou-faux";

/**
 * Le message qui fait écrire les questions d'un groupe. Partagé avec le banc
 * (`scripts/evaluation/`), qui doit mesurer exactement ce que le produit envoie.
 * La cible du vrai ou faux est ici et non dans le prompt système, mis en cache.
 */

export type ConceptAEnvoyer = {
  /** L'id de l'Atom en production ; au banc, qui n'écrit rien, le texte du concept. */
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
