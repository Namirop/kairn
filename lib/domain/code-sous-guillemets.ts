/**
 * Le prompt d'extraction fait citer un mot étranger entre guillemets, ce qui
 * attrape aussi `minSdk` ou `app/build.gradle.kts` et leur fait perdre leur
 * rendu en jeton. Rendus ici aux accents graves, à la lecture, pour couvrir
 * aussi les questions déjà en base.
 */

/**
 * Les signes qu'un mot de prose ne porte pas. Trait d'union et apostrophe
 * absents exprès (« porte-greffe », « aujourd'hui ») ; le souligné y est.
 */
const SIGNES_DE_CODE = /[./\\:;=()[\]{}<>$#@*|~^%+,]/;

/** Une minuscule suivie d'une capitale : `minSdk`, `MainActivity`. */
const CASSE_MELEE = /\p{Ll}\p{Lu}/u;

/** Un accent grave dans le terme l'exclut : il fabriquerait une paire de plus. */
const CITATION = /«([^«»`]+)»/g;

/**
 * Un terme avec espace est une expression, un terme sans lettre une valeur.
 * Erreur acceptée : « iPhone » passe pour du code, un jeton en trop se lit mieux
 * qu'un identifiant noyé.
 */
export function estUnTermeDeCode(terme: string): boolean {
  const propre = terme.trim();

  if (propre.length === 0 || /\s/u.test(propre)) return false;
  if (!/\p{L}/u.test(propre)) return false;

  return SIGNES_DE_CODE.test(propre) || CASSE_MELEE.test(propre);
}

/** Seuls les termes de code passent aux accents graves ; le reste garde ses guillemets. */
export function releverLeCodeCite(texte: string): string {
  if (!texte.includes("«")) return texte;

  return texte.replace(CITATION, (entier, dedans: string) =>
    estUnTermeDeCode(dedans) ? `\`${dedans.trim()}\`` : entier,
  );
}
