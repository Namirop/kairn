/**
 * Le moment « tu maîtrises ça ».
 *
 * Trois bonnes réponses de plus en plus rapides, pas seulement trois bonnes
 * réponses : qui reconstruit répond juste mais met le même temps à chaque fois.
 */

/** Longueur de la série examinée. */
export const PASSAGES_POUR_LE_SIGNAL = 3;

export type PassageJuge = {
  reussi: boolean;
  /** Mesuré de l'affichage de la question à la validation, jamais au-delà. */
  tempsMs: number;
};

export type SignalDeMaitrise = {
  /** Temps du premier des passages retenus. */
  depuisMs: number;
  /** Temps du dernier. */
  versMs: number;
  /** Ce que l'écran montre : le temps gagné entre les deux. */
  gainMs: number;
};

/**
 * Le signal, ou `null` s'il n'y a rien à annoncer.
 *
 * `passages` va du plus ancien au plus récent ; seuls les derniers comptent.
 * La décroissance est stricte : le même rythme n'est pas une accélération.
 */
export function signalDeMaitrise(passages: readonly PassageJuge[]): SignalDeMaitrise | null {
  if (passages.length < PASSAGES_POUR_LE_SIGNAL) return null;

  const derniers = passages.slice(-PASSAGES_POUR_LE_SIGNAL);

  if (!derniers.every((passage) => passage.reussi)) return null;

  const temps = derniers.map((passage) => passage.tempsMs);
  // Sur la tranche décalée d'un, `temps[rang]` est le temps précédent. Une
  // valeur absente rend la comparaison fausse : le doute ne déclenche rien.
  const accelere = temps
    .slice(1)
    .every((valeur, rang) => valeur < (temps[rang] ?? Number.NEGATIVE_INFINITY));

  if (!accelere) return null;

  const depuisMs = temps[0];
  const versMs = temps[temps.length - 1];

  if (depuisMs === undefined || versMs === undefined) return null;

  return { depuisMs, versMs, gainMs: depuisMs - versMs };
}
