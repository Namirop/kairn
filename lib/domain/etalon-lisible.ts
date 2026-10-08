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
 *
 * **Le texte à trou en a une à lui**, et elle a échappé au tour du 02/09 qui a
 * mis les autres formats à l'indicatif : « Le terme attendu est « collectivise » :
 * l'économie soviétique est collectivisée… ». Sur ce format, le terme vient de
 * se poser dans la phrase, souligné de lichen, deux centimètres au-dessus du
 * bloc. L'annoncer une seconde fois occupe la première ligne à redire ce que
 * l'œil vient de lire. La consigne d'écriture est corrigée de son côté ; ici on
 * rattrape le stock, qui vivra des mois.
 *
 * **Les étiquettes anglaises sont lues avec les françaises**, sans qu'on dise
 * la langue de l'étalon : « Answer: » n'ouvre pas une phrase française, ni
 * « Réponse : » une anglaise. Un étalon anglais garderait sinon sa redite, et
 * rien ne le signalerait.
 */
const ETIQUETTES: readonly RegExp[] = [
  /^\s*(?:l[ae]\s+)?(?:r[eé]ponse(?:\s+(?:attendue?s?|correcte?s?))?|attendu|[eé]talon)\s*[:—-]\s*/i,
  /^\s*l[ea]\s+(?:terme|mot|expression)\s+(?:attendue?|masqu[eé]e?|manquante?|recherch[eé]e?)\s+(?:est|[eé]tait)\s*[«"“']?[^«»"“”:]{1,60}[»"”']?\s*[:—–-]\s*/i,
  /^\s*(?:the\s+)?(?:(?:expected|correct|right)\s+)?(?:answer|response)\s*(?::|\s[—–-])\s*/i,
  /^\s*expected\s*(?::|\s[—–-])\s*/i,
  /^\s*the\s+(?:expected|missing|hidden)\s+(?:term|word|answer)\s+is\s*[«"“']?[^«»"“”:]{1,60}[»"”']?\s*[:—–-]\s*/i,
];

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
  for (const etiquette of ETIQUETTES) {
    const sansEtiquette = answerKey.replace(etiquette, "");

    if (sansEtiquette === answerKey || sansEtiquette.trim().length === 0) continue;

    return enPhrase(sansEtiquette);
  }

  return answerKey;
}
