/**
 * L'étalon débarrassé de l'étiquette que la génération lui met devant.
 *
 * Le modèle commence souvent sa réponse par « Réponse attendue : ». Sous un
 * intitulé qui dit déjà « la réponse », ça faisait dire deux fois le même mot à
 * deux lignes d'écart — et la phrase utile commençait par une redite.
 *
 * On ne retire qu'une étiquette de tête, et seulement si elle est suivie de
 * quelque chose : un étalon qui ne serait que « Réponse : » reste tel quel plutôt
 * que de disparaître. Le reste du texte n'est jamais touché — « Faux. La réponse
 * attendue mentionne… » garde sa phrase entière, parce que l'étiquette n'y est
 * pas en tête.
 */
const ETIQUETTE =
  /^\s*(?:l[ae]\s+)?(?:r[eé]ponse(?:\s+(?:attendue?s?|correcte?s?))?|attendu|[eé]talon)\s*[:—-]\s*/i;

/**
 * L'étiquette retirée laissait une phrase qui commence en minuscule, parce
 * qu'elle était écrite pour suivre un deux-points. On remonte la première lettre
 * en capitale — et seulement une lettre : un étalon qui commence par du code
 * garde son `at(-1)` tel quel.
 */
function enPhrase(texte: string): string {
  const premiere = texte[0] ?? "";

  return premiere.toLowerCase() === premiere && premiere.toUpperCase() !== premiere
    ? premiere.toUpperCase() + texte.slice(1)
    : texte;
}

export function etalonLisible(answerKey: string): string {
  const sansEtiquette = answerKey.replace(ETIQUETTE, "");

  if (sansEtiquette === answerKey || sansEtiquette.trim().length === 0) return answerKey;

  return enPhrase(sansEtiquette);
}
