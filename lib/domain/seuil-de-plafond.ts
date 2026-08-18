/**
 * À partir de quand un compteur journalier mérite qu'on prévienne.
 *
 * Trois seuils, et le troisième n'est pas de la même nature que les deux
 * autres. Soixante-dix et quatre-vingt-dix pour cent annoncent : la journée se
 * remplit plus vite que d'habitude, il reste le temps de décider. Cent pour cent
 * constate : des dépôts échouent en ce moment, et le message n'a plus rien à
 * anticiper.
 *
 * Le seuil rendu est **le plus haut atteint**, pas le premier franchi. Un
 * compteur qui saute de soixante à quatre-vingt-quinze en un envoi groupé ne
 * doit pas déclencher l'alerte de soixante-dix : celle de quatre-vingt-dix est
 * strictement plus urgente et porte les mêmes chiffres. C'est aussi ce qui rend
 * la fonction indépendante de la valeur d'avant — elle ne regarde que l'état, et
 * un état ne se rejoue pas de travers.
 */

export const SEUILS_DALERTE = [100, 90, 70] as const;

export type SeuilDePlafond = (typeof SEUILS_DALERTE)[number];

/**
 * Le seuil atteint par ce compteur, ou rien.
 *
 * **La comparaison est entière, et ce n'est pas un détail de style.** Écrite en
 * pourcentage — `(utilisees / plafond) * 100 >= seuil` — elle rate le cas exact
 * une fois sur deux : trente-cinq sur cinquante vaut 69,99999999999999 en
 * virgule flottante, et l'alerte des soixante-dix pour cent ne partirait pas au
 * moment précis où elle est due. Multiplier des deux côtés garde des entiers, et
 * un entier est égal à lui-même.
 *
 * Un plafond nul ou négatif ne rend rien : il n'y a pas de proportion d'un
 * plafond qui n'existe pas, et la configuration refuse déjà ces valeurs en
 * amont.
 */
export function seuilAtteint(utilisees: number, plafond: number): SeuilDePlafond | null {
  if (plafond <= 0) return null;

  return SEUILS_DALERTE.find((seuil) => utilisees * 100 >= seuil * plafond) ?? null;
}
