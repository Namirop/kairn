import { TROU } from "./reponse-cloze";
import { aplati } from "./texte-aplati";

/**
 * Le terme masqué qui déborde sur la phrase qui l'entoure.
 *
 * « Une fenêtre de \_\_\_ semaines », terme « 52 semaines » : la réponse « 52 »
 * est refusée par la comparaison, et l'écran affiche « 52 semaines semaines ».
 * Le mot déjà écrit contre le trou est rendu à la phrase.
 *
 * Réparé à la lecture, comme `etalonLisible`, pour couvrir aussi les questions
 * déjà en base. La prévention vit dans le prompt, la mesure dans
 * `controlerQuestion`.
 */

/** Minuscules, sans accents, sans ponctuation : de quoi comparer deux mots. */
function motNu(mot: string): string {
  return aplati(mot).replace(/[^a-z0-9]+/g, "");
}

function mots(texte: string): string[] {
  return texte.split(/\s+/).filter((mot) => motNu(mot).length > 0);
}

/**
 * Ce qui borde le trou, lu depuis le trou : les mots d'avant à reculons, les
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
    gauche.every((mot, rang) => motNu(mot) === motNu(droite[rang] ?? ""))
  );
}

/**
 * Combien de mots le terme partage avec un bord, en partant du trou.
 *
 * Le plus long recouvrement, pas le premier mot : « effet \_\_\_ de bord » avec
 * « effet indésirable de bord » recouvre deux mots sans que « bord » et « de »
 * correspondent. Jamais tous les mots, sinon la réponse serait vide.
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
 * trou : à droite d'abord, puis à gauche sur ce qui reste.
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
 * Le texte à trou tel qu'on le sert.
 *
 * Seule la première forme acceptée, celle que l'écran affiche dans le trou, est
 * rognée ; la forme longue reste acceptée parce qu'elle est juste. Les leurres
 * sont rognés aussi, sans quoi le terme juste se repérerait à sa forme.
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
