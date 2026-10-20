/**
 * L'étalon débarrassé de l'étiquette de tête que le modèle lui met (« Réponse
 * attendue : »), seulement si quelque chose la suit. L'étiquette du texte à
 * trou (« Le terme attendu est « X » : ») n'est plus produite mais reste en
 * base. Les deux langues sont lues ensemble : aucune étiquette n'ouvre une
 * phrase de l'autre.
 */
const ETIQUETTES: readonly RegExp[] = [
  /^\s*(?:l[ae]\s+)?(?:r[eé]ponse(?:\s+(?:attendue?s?|correcte?s?))?|attendu|[eé]talon)\s*[:—-]\s*/i,
  /^\s*l[ea]\s+(?:terme|mot|expression)\s+(?:attendue?|masqu[eé]e?|manquante?|recherch[eé]e?)\s+(?:est|[eé]tait)\s*[«"“']?[^«»"“”:]{1,60}[»"”']?\s*[:—–-]\s*/i,
  /^\s*(?:the\s+)?(?:(?:expected|correct|right)\s+)?(?:answer|response)\s*(?::|\s[—–-])\s*/i,
  /^\s*expected\s*(?::|\s[—–-])\s*/i,
  /^\s*the\s+(?:expected|missing|hidden)\s+(?:term|word|answer)\s+is\s*[«"“']?[^«»"“”:]{1,60}[»"”']?\s*[:—–-]\s*/i,
];

/** Du code entre accents graves reste tel quel ; du code nu serait capitalisé. */
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
