/**
 * Le moment « tu maîtrises ça ».
 *
 * Le signal n'est pas « trois bonnes réponses » — c'est **trois bonnes réponses
 * de plus en plus rapides**. La différence est celle entre savoir reconstruire
 * et savoir tout court : quelqu'un qui reconstruit répond juste, mais met le
 * même temps à chaque fois.
 *
 * Tout est déjà dans `Review` : la note et le temps de réponse. Aucun appel
 * modèle, aucune donnée à ajouter.
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
 * `passages` est l'histoire du concept, du plus ancien au plus récent. Seuls
 * les derniers comptent : une accélération d'il y a trois mois ne dit rien de
 * maintenant.
 *
 * La décroissance est **stricte**. Trois réussites au même rythme disent qu'on
 * récite aussi bien qu'avant, ce qui n'est pas la même nouvelle.
 */
export function signalDeMaitrise(passages: readonly PassageJuge[]): SignalDeMaitrise | null {
  if (passages.length < PASSAGES_POUR_LE_SIGNAL) return null;

  const derniers = passages.slice(-PASSAGES_POUR_LE_SIGNAL);

  if (!derniers.every((passage) => passage.reussi)) return null;

  const temps = derniers.map((passage) => passage.tempsMs);
  // Comparé au rang précédent : sur la tranche décalée d'un, `temps[rang]` est
  // justement celui d'avant. Une valeur absente rendrait la comparaison fausse,
  // donc pas de signal — le doute ne déclenche rien.
  const accelere = temps
    .slice(1)
    .every((valeur, rang) => valeur < (temps[rang] ?? Number.NEGATIVE_INFINITY));

  if (!accelere) return null;

  const depuisMs = temps[0];
  const versMs = temps[temps.length - 1];

  if (depuisMs === undefined || versMs === undefined) return null;

  return { depuisMs, versMs, gainMs: depuisMs - versMs };
}
