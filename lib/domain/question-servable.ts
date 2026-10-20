/**
 * Le dernier filet contre la carte blanche : la génération écarte déjà les
 * questions vides (`inexploitable`), mais des lignes anciennes dorment en base.
 * L'étalon compte aussi : un format abîmé retombe sur la question ouverte
 * (`ZoneDeReponse`), dont « Voir la réponse » n'aurait rien à montrer. Le format
 * est ignoré exprès, pour la même raison.
 */
export type FormulationLisible = { question: string; answerKey: string };

/**
 * Au moins une lettre ou un chiffre : le modèle abrège parfois en « ... », qui
 * passerait un test de chaîne vide, et une réponse peut être « 52 ».
 */
export function porteDuTexte(texte: string): boolean {
  return /[\p{L}\p{N}]/u.test(texte);
}

export function questionServable(variante: FormulationLisible): boolean {
  return porteDuTexte(variante.question) && porteDuTexte(variante.answerKey);
}
