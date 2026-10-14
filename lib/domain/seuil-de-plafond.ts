/**
 * À partir de quand un compteur journalier mérite qu'on prévienne.
 *
 * 70 et 90 % annoncent qu'il reste le temps de décider ; 100 % constate que
 * des dépôts échouent en ce moment.
 *
 * Le seuil rendu est le plus haut atteint, pas le premier franchi : un saut de
 * 60 à 95 ne déclenche que l'alerte de 90, et la fonction ne dépend que de
 * l'état courant, pas de la valeur d'avant.
 */

export const SEUILS_DALERTE = [100, 90, 70] as const;

export type SeuilDePlafond = (typeof SEUILS_DALERTE)[number];

/**
 * Le seuil atteint par ce compteur, ou `null`.
 *
 * La comparaison reste en entiers : en pourcentage flottant, 35/50 donne
 * 69,99999999999999 et l'alerte de 70 % ne partirait pas.
 */
export function seuilAtteint(utilisees: number, plafond: number): SeuilDePlafond | null {
  if (plafond <= 0) return null;

  return SEUILS_DALERTE.find((seuil) => utilisees * 100 >= seuil * plafond) ?? null;
}
