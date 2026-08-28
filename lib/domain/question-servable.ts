/**
 * Une formulation a-t-elle de quoi être posée ?
 *
 * **Le dernier filet, et il existe parce que le premier a cédé.** La relecture
 * de la génération laisse maintenant tomber une question sans texte ni réponse
 * — voir `inexploitable` dans `generate-variants.ts` —, mais des lignes écrites
 * avant ce jour-là dorment en base, et rien n'empêche une génération future de
 * trouver un autre chemin vers le même vide. Un écran de révision ne doit pas
 * pouvoir afficher une carte blanche : la condition se relit donc au moment de
 * servir, où elle ne coûte rien.
 *
 * **Les deux champs comptent, et pas seulement le premier.** Le texte, parce que
 * c'est ce que la carte pose en titre — sans lui, il n'y a rien à lire. La
 * réponse, parce que tout format retombe sur la question ouverte quand sa charge
 * est abîmée : un QCM sans options servables devient un « Voir la réponse », et
 * ce bouton n'a plus rien à montrer si l'étalon est vide. C'est exactement la
 * suite d'événements qui a produit la carte blanche.
 *
 * On ne regarde pas le format : la règle vaut pour tous, et une règle qui ferait
 * des exceptions par format en aurait une de trop le jour où un format retombe
 * sur un autre — ce qui est précisément ce que fait `ZoneDeReponse`.
 */
export type FormulationLisible = { question: string; answerKey: string };

export function questionServable(variante: FormulationLisible): boolean {
  return variante.question.trim().length > 0 && variante.answerKey.trim().length > 0;
}
