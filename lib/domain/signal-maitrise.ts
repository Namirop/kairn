/**
 * Le moment « tu maîtrises ça » : des bonnes réponses de plus en plus rapides,
 * car qui reconstruit répond juste mais met le même temps à chaque fois.
 */

export const PASSAGES_POUR_LE_SIGNAL = 3;

export type PassageJuge = {
  reussi: boolean;
  /** Mesuré de l'affichage de la question à la validation, jamais au-delà. */
  tempsMs: number;
};

export type SignalDeMaitrise = {
  depuisMs: number;
  versMs: number;
  /** Ce que l'écran montre. */
  gainMs: number;
};

/**
 * `passages` va du plus ancien au plus récent. La décroissance est stricte : le
 * même rythme n'est pas une accélération.
 */
export function signalDeMaitrise(passages: readonly PassageJuge[]): SignalDeMaitrise | null {
  if (passages.length < PASSAGES_POUR_LE_SIGNAL) return null;

  const derniers = passages.slice(-PASSAGES_POUR_LE_SIGNAL);

  if (!derniers.every((passage) => passage.reussi)) return null;

  const temps = derniers.map((passage) => passage.tempsMs);
  // Décalé d'un, `temps[rang]` est le précédent ; une valeur absente ne déclenche rien.
  const accelere = temps
    .slice(1)
    .every((valeur, rang) => valeur < (temps[rang] ?? Number.NEGATIVE_INFINITY));

  if (!accelere) return null;

  const depuisMs = temps[0];
  const versMs = temps[temps.length - 1];

  if (depuisMs === undefined || versMs === undefined) return null;

  return { depuisMs, versMs, gainMs: depuisMs - versMs };
}
