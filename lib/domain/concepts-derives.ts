/**
 * Combien de concepts se déclarent découler d'un voisin. On le mesure, on ne
 * coupe pas : le modèle place « découle de » bien plus loin que nous, et couper
 * sur ce champ faisait tomber le corpus du banc de 129 à 85 concepts pour sept
 * redondants réels.
 */

export type Derivable = { deriveDe?: number | null };

/** Les indices annoncés au modèle partent de 1 ; un renvoi à soi-même ne compte pas. */
function renvoieAUnAutre(concept: Derivable, rang: number, total: number): boolean {
  const cible = concept.deriveDe ?? null;

  if (cible === null || !Number.isInteger(cible)) return false;

  return cible >= 1 && cible <= total && cible !== rang + 1;
}

export function compterLesDerives(concepts: readonly Derivable[]): number {
  return concepts.filter((concept, rang) => renvoieAUnAutre(concept, rang, concepts.length)).length;
}
