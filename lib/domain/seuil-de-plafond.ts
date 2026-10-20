/**
 * À partir de quand un compteur journalier mérite qu'on prévienne. 70 et 90 %
 * laissent le temps de décider ; 100 % constate que des dépôts échouent. Le
 * seuil rendu est le plus haut atteint : la fonction ignore la valeur d'avant.
 */

export const SEUILS_DALERTE = [100, 90, 70] as const;

export type SeuilDePlafond = (typeof SEUILS_DALERTE)[number];

/** En entiers : en flottant, 35/50 donne 69,99999999999999 % et 70 % ne partirait pas. */
export function seuilAtteint(utilisees: number, plafond: number): SeuilDePlafond | null {
  if (plafond <= 0) return null;

  return SEUILS_DALERTE.find((seuil) => utilisees * 100 >= seuil * plafond) ?? null;
}
