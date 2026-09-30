/**
 * Les termes de code que le modèle a mis entre guillemets, rendus aux accents
 * graves qui les relèvent.
 *
 * **Une consigne écrite pour l'espagnol attrape aussi les identifiants.** Le
 * prompt d'extraction demande depuis toujours de recopier ce que le dépôt cite
 * « entre guillemets, sans le traduire » : elle vise un mot étranger — « ser »,
 * « spill the tea » —, et c'est la bonne façon de l'écrire. Elle attrape au
 * passage `minSdk`, `libapp.so` et `app/build.gradle.kts`, qui arrivent alors
 * en guillemets français au milieu d'une phrase. Mesuré sur la production :
 * soixante questions vivantes citent un terme de code entre guillemets, vingt
 * en accents graves — trois citations sur quatre perdaient leur jeton.
 *
 * Le rendu, lui, existe : `segmentsDeCode` relève ce qui est entre accents
 * graves, et `TexteTechnique` le peint en jeton partout où le produit affiche
 * du texte. Il ne manquait que le marqueur. On le pose donc à la lecture, comme
 * `phraseSansDevoilement` répare un trou dévoilé : le stock déjà écrit en
 * profite le jour même, sans réécrire une seule ligne en base.
 *
 * Fonction pure : elle dit ce qu'un terme est, jamais comment le peindre.
 */

/**
 * Les signes qu'un mot de prose ne porte pas.
 *
 * Le trait d'union et l'apostrophe en sont absents, et c'est tout l'intérêt de
 * la liste : « porte-greffe » et « aujourd'hui » sont des mots français, pas
 * des identifiants. Le souligné, lui, y est — aucun mot ne s'écrit avec.
 */
const SIGNES_DE_CODE = /[./\\:;=()[\]{}<>$#@*|~^%+,]/;

/** Une minuscule suivie d'une capitale : `minSdk`, `versionName`, `MainActivity`. */
const CASSE_MELEE = /\p{Ll}\p{Lu}/u;

/**
 * Ce qui est cité entre guillemets, sans les guillemets.
 *
 * Un accent grave dans le terme le disqualifie d'office : le relever
 * fabriquerait une paire de plus et casserait le découpage d'à côté.
 */
const CITATION = /«([^«»`]+)»/g;

/**
 * Ce terme cité est-il du code plutôt qu'un mot d'une autre langue ?
 *
 * Trois conditions, et elles se lisent dans l'ordre où elles écartent. Un
 * terme qui respire — « spill the tea », « Kotlin first » — est une expression
 * et reste entre guillemets ; un terme sans lettre — « 1.0.1 », « ___ » — n'est
 * pas un identifiant, c'est une valeur ou un trou. Ce qui reste est du code
 * quand il porte un signe qu'aucun mot de prose ne porte, ou la casse mêlée
 * qu'aucune langue n'écrit au milieu d'un mot.
 *
 * L'erreur qu'on accepte est celle-ci : « iPhone » et « DuelFinder » passent
 * pour du code. Ce sont des noms écrits comme des identifiants, ils le sont
 * souvent dans le texte d'où ils viennent, et un jeton en trop se lit — là où
 * un identifiant noyé dans la ponctuation ne se lit pas.
 */
export function estUnTermeDeCode(terme: string): boolean {
  const propre = terme.trim();

  if (propre.length === 0 || /\s/u.test(propre)) return false;
  if (!/\p{L}/u.test(propre)) return false;

  return SIGNES_DE_CODE.test(propre) || CASSE_MELEE.test(propre);
}

/**
 * Le texte dont les termes de code cités passent des guillemets aux accents
 * graves.
 *
 * Ce qui n'est pas du code n'est pas touché : les guillemets restent, parce
 * qu'ils sont justes. C'est le même texte à un marqueur près, et il se donne
 * ensuite à `segmentsDeCode` sans que celui-ci ait à connaître cette règle.
 */
export function releverLeCodeCite(texte: string): string {
  if (!texte.includes("«")) return texte;

  return texte.replace(CITATION, (entier, dedans: string) =>
    estUnTermeDeCode(dedans) ? `\`${dedans.trim()}\`` : entier,
  );
}
