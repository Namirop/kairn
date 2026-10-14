/**
 * L'étalon débarrassé de l'étiquette que la génération lui met devant.
 *
 * Le modèle ouvre souvent par « Réponse attendue : », sous un intitulé qui dit
 * déjà « la réponse ». On ne retire qu'une étiquette de tête, et seulement si
 * quelque chose la suit : un étalon réduit à « Réponse : » reste tel quel.
 *
 * Le texte à trou a la sienne (« Le terme attendu est « X » : … »), qui redit
 * le terme qu'on vient de lire dans la phrase. Le prompt ne la produit plus,
 * mais les questions déjà stockées la portent encore.
 *
 * Les étiquettes anglaises sont lues avec les françaises sans connaître la
 * langue : aucune n'ouvre une phrase de l'autre langue.
 */
const ETIQUETTES: readonly RegExp[] = [
  /^\s*(?:l[ae]\s+)?(?:r[eé]ponse(?:\s+(?:attendue?s?|correcte?s?))?|attendu|[eé]talon)\s*[:—-]\s*/i,
  /^\s*l[ea]\s+(?:terme|mot|expression)\s+(?:attendue?|masqu[eé]e?|manquante?|recherch[eé]e?)\s+(?:est|[eé]tait)\s*[«"“']?[^«»"“”:]{1,60}[»"”']?\s*[:—–-]\s*/i,
  /^\s*(?:the\s+)?(?:(?:expected|correct|right)\s+)?(?:answer|response)\s*(?::|\s[—–-])\s*/i,
  /^\s*expected\s*(?::|\s[—–-])\s*/i,
  /^\s*the\s+(?:expected|missing|hidden)\s+(?:term|word|answer)\s+is\s*[«"“']?[^«»"“”:]{1,60}[»"”']?\s*[:—–-]\s*/i,
];

/**
 * Sans son étiquette, la phrase commence souvent en minuscule : on remonte le
 * premier signe en capitale s'il est une lettre minuscule. Du code entre
 * accents graves reste donc tel quel, mais du code nu (`at(-1)` sans accents)
 * serait capitalisé.
 */
function enPhrase(texte: string): string {
  const premiere = texte[0] ?? "";

  return premiere.toLowerCase() === premiere && premiere.toUpperCase() !== premiere
    ? premiere.toUpperCase() + texte.slice(1)
    : texte;
}

export function etalonLisible(answerKey: string): string {
  for (const etiquette of ETIQUETTES) {
    const sansEtiquette = answerKey.replace(etiquette, "");

    if (sansEtiquette === answerKey || sansEtiquette.trim().length === 0) continue;

    return enPhrase(sansEtiquette);
  }

  return answerKey;
}
