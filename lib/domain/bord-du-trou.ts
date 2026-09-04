import { TROU } from "./reponse-cloze";

/**
 * Le terme masqué qui déborde sur la phrase qui l'entoure.
 *
 * « Le classement ATP glisse sur une fenêtre de \_\_\_ semaines. », terme
 * attendu « 52 semaines ». Deux dégâts d'un coup : la personne écrit « 52 »,
 * qui est la bonne réponse, et la comparaison la refuse parce qu'elle compte les
 * mots ; puis l'écran comble le trou et affiche « de 52 semaines semaines ».
 *
 * Le mot en trop n'est pas une connaissance à vérifier — il est déjà écrit à
 * côté du trou, tout le monde le lit. On le rend donc à la phrase.
 *
 * **Réparé à la lecture, et pas à l'écriture**, comme `etalonLisible` : c'est le
 * seul endroit qui répare aussi les questions déjà en base, et il n'y en a
 * qu'un. La prévention vit dans le prompt, la mesure dans `controlerQuestion`.
 */

/** Minuscules, sans accents, sans ponctuation : de quoi comparer deux mots. */
function aplati(mot: string): string {
  return mot
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function mots(texte: string): string[] {
  return texte.split(/\s+/).filter((mot) => aplati(mot).length > 0);
}

/**
 * Ce qui borde le trou, lu **depuis le trou** : les mots d'avant à reculons, les
 * mots d'après dans l'ordre. Vide si la phrase n'en porte pas.
 */
function bords(phrase: string): { avant: string[]; apres: string[] } {
  const [avant = "", ...suite] = phrase.split(TROU);

  if (suite.length === 0) return { avant: [], apres: [] };

  return { avant: mots(avant).reverse(), apres: mots(suite.join(TROU)) };
}

/** Deux suites de mots disent-elles la même chose, aux accents et à la casse près ? */
function memesMots(gauche: readonly string[], droite: readonly string[]): boolean {
  return (
    gauche.length === droite.length &&
    gauche.every((mot, rang) => aplati(mot) === aplati(droite[rang] ?? ""))
  );
}

/**
 * Combien de mots le terme partage avec un bord, en partant du trou.
 *
 * On cherche le plus long recouvrement et non le premier mot venu : sur « un
 * effet \_\_\_ de bord » avec « effet indésirable de bord », le dernier mot du
 * terme est « bord » et le premier du bord est « de » — mot à mot, rien ne
 * correspond, alors que deux mots entiers sont en trop.
 *
 * Jamais tous les mots : un terme entièrement contenu dans ses bords n'existe
 * pas — ce serait une phrase où le trou ne masque rien —, et le rogner à vide
 * donnerait une réponse impossible à écrire.
 */
function recouvrement(
  terme: readonly string[],
  bord: readonly string[],
  versLeTrou: (mots: readonly string[], k: number) => readonly string[],
): number {
  for (let k = Math.min(terme.length - 1, bord.length); k >= 1; k -= 1) {
    if (memesMots(versLeTrou(terme, k), bord.slice(0, k))) return k;
  }

  return 0;
}

/**
 * Le terme, débarrassé des mots que la phrase répète déjà de part et d'autre du
 * trou.
 *
 * On rogne à droite d'abord, puis à gauche sur ce qui reste.
 */
export function sansLesBordsDuTrou(phrase: string, terme: string): string {
  const { avant, apres } = bords(phrase);
  const retenus = mots(terme);

  const aDroite = recouvrement(retenus, apres, (suite, k) => suite.slice(suite.length - k));
  const sansLaDroite = retenus.slice(0, retenus.length - aDroite);

  // Le bord gauche se lit du trou vers le début de la phrase ; on retourne donc
  // la tête du terme pour comparer les deux suites dans le même sens.
  const aGauche = recouvrement(sansLaDroite, avant, (suite, k) => suite.slice(0, k).reverse());

  return sansLaDroite.slice(aGauche).join(" ");
}

/** Le terme attendu redit-il un mot que la phrase pose déjà contre le trou ? */
export function termeDebordeSurLaPhrase(phrase: string, terme: string): boolean {
  return sansLesBordsDuTrou(phrase, terme) !== mots(terme).join(" ");
}

export type TexteATrouEnBase = {
  sentence: string;
  accepted: string[];
  leurres: string[];
};

/**
 * Le texte à trou tel qu'on le sert : son terme rendu à sa juste longueur, la
 * forme d'origine gardée parmi les réponses acceptées.
 *
 * La forme longue reste acceptée parce qu'elle reste juste : quelqu'un qui écrit
 * « 52 semaines » a la bonne réponse, il en dit seulement un mot de plus que
 * nécessaire. C'est la première forme qui change, et elle seule — c'est elle que
 * l'écran affiche dans le trou.
 *
 * Les leurres sont rognés du même geste. Sans quoi la liste du coup de pouce
 * mettrait « 52 » à côté de « quarante-huit semaines » : le terme juste s'y
 * repérerait à sa forme, sans qu'on sache rien du concept.
 */
export function trouSansRedite(cloze: TexteATrouEnBase): TexteATrouEnBase {
  const [attendu, ...autres] = cloze.accepted;

  if (attendu === undefined) return cloze;

  const rogne = sansLesBordsDuTrou(cloze.sentence, attendu);

  if (rogne === attendu) return cloze;

  return {
    sentence: cloze.sentence,
    accepted: [rogne, attendu, ...autres],
    leurres: cloze.leurres.map((leurre) => sansLesBordsDuTrou(cloze.sentence, leurre)),
  };
}
