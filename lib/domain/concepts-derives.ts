/**
 * Combien de concepts se déclarent découler d'un voisin. On le mesure, on ne
 * coupe pas.
 *
 * Couper sur ce champ détruit des concepts légitimes : « découle de » est un
 * jugement à frontière floue, que le modèle place bien plus loin que nous (six
 * concepts sur sept rattachés au premier sur un dépôt du banc), et le corpus
 * tombait de 129 à 85 concepts pour sept redondants réels. Le champ reste dans
 * le schéma pour la mesure ; la granularité relève d'un juge, pas d'une coupe.
 */

export type Derivable = { deriveDe?: number | null };

/**
 * Un renvoi ne compte que s'il désigne un autre concept du même envoi. Les
 * indices annoncés au modèle partent de 1 ; un renvoi à soi-même, à zéro ou
 * hors de la liste ne décrit rien et gonflerait la mesure.
 */
function renvoieAUnAutre(concept: Derivable, rang: number, total: number): boolean {
  const cible = concept.deriveDe ?? null;

  if (cible === null || !Number.isInteger(cible)) return false;

  return cible >= 1 && cible <= total && cible !== rang + 1;
}

export function compterLesDerives(concepts: readonly Derivable[]): number {
  return concepts.filter((concept, rang) => renvoieAUnAutre(concept, rang, concepts.length)).length;
}
