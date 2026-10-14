/**
 * Une formulation a-t-elle de quoi être posée ?
 *
 * Le dernier filet contre la carte blanche : la génération écarte déjà les
 * questions vides (`inexploitable` dans `generate-variants.ts`), mais des lignes
 * plus anciennes dorment en base. La condition se relit donc au moment de
 * servir, où elle ne coûte rien.
 *
 * Les deux champs comptent : le texte est le titre de la carte, et tout format
 * dont la charge est abîmée retombe sur la question ouverte, dont « Voir la
 * réponse » n'aurait rien à montrer si l'étalon est vide.
 *
 * La règle ignore le format exprès : un format peut retomber sur un autre
 * (`ZoneDeReponse`).
 */
export type FormulationLisible = { question: string; answerKey: string };

/**
 * Le texte porte-t-il quelque chose à lire ?
 *
 * Le blanc n'est pas le seul vide : le modèle abrège parfois un lot en « ... »,
 * qui passerait un test de chaîne vide. Il faut au moins une lettre ou un
 * chiffre (une réponse peut être « 52 »). Ce n'est pas une borne de longueur.
 */
export function porteDuTexte(texte: string): boolean {
  return /[\p{L}\p{N}]/u.test(texte);
}

export function questionServable(variante: FormulationLisible): boolean {
  return porteDuTexte(variante.question) && porteDuTexte(variante.answerKey);
}
