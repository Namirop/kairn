/**
 * Les termes de code que le modèle a mis entre guillemets, rendus aux accents
 * graves qui les relèvent.
 *
 * Le prompt d'extraction demande de citer « entre guillemets, sans le
 * traduire » un mot étranger ; la consigne attrape aussi `minSdk` ou
 * `app/build.gradle.kts`, qui perdent alors leur rendu en jeton
 * (`segmentsDeCode`, `TexteTechnique`). Réparé à la lecture, comme
 * `phraseSansDevoilement`, pour couvrir aussi les questions déjà en base.
 */

/**
 * Les signes qu'un mot de prose ne porte pas. Le trait d'union et l'apostrophe
 * en sont absents exprès (« porte-greffe », « aujourd'hui ») ; le souligné y
 * est.
 */
const SIGNES_DE_CODE = /[./\\:;=()[\]{}<>$#@*|~^%+,]/;

/** Une minuscule suivie d'une capitale : `minSdk`, `versionName`, `MainActivity`. */
const CASSE_MELEE = /\p{Ll}\p{Lu}/u;

/**
 * Ce qui est cité entre guillemets, sans les guillemets. Un accent grave dans le
 * terme l'exclut : le relever fabriquerait une paire de plus et casserait le
 * découpage voisin.
 */
const CITATION = /«([^«»`]+)»/g;

/**
 * Ce terme cité est-il du code plutôt qu'un mot d'une autre langue ?
 *
 * Un terme avec espace est une expression ; un terme sans lettre est une valeur
 * ou un trou. Le reste est du code s'il porte un signe de code ou une casse
 * mêlée. Erreur acceptée : « iPhone » passe pour du code, un jeton en trop se
 * lit mieux qu'un identifiant noyé.
 */
export function estUnTermeDeCode(terme: string): boolean {
  const propre = terme.trim();

  if (propre.length === 0 || /\s/u.test(propre)) return false;
  if (!/\p{L}/u.test(propre)) return false;

  return SIGNES_DE_CODE.test(propre) || CASSE_MELEE.test(propre);
}

/**
 * Le texte dont les termes de code cités passent des guillemets aux accents
 * graves ; le reste garde ses guillemets.
 */
export function releverLeCodeCite(texte: string): string {
  if (!texte.includes("«")) return texte;

  return texte.replace(CITATION, (entier, dedans: string) =>
    estUnTermeDeCode(dedans) ? `\`${dedans.trim()}\`` : entier,
  );
}
