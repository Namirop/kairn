import { TROU } from "./reponse-cloze";
import { aplati } from "./texte-aplati";

/**
 * Le terme masqué qui redit un mot déjà écrit contre le trou : « fenêtre de
 * \_\_\_ semaines », terme « 52 semaines ». Réparé à la lecture pour couvrir les
 * questions déjà en base ; la prévention vit dans le prompt, la mesure dans
 * `controlerQuestion`.
 */

/** Minuscules, sans accents, sans ponctuation : de quoi comparer deux mots. */
function motNu(mot: string): string {
  return aplati(mot).replace(/[^a-z0-9]+/g, "");
}

function mots(texte: string): string[] {
  return texte.split(/\s+/).filter((mot) => motNu(mot).length > 0);
}

/** Lus depuis le trou : les mots d'avant à reculons, ceux d'après dans l'ordre. */
function bords(phrase: string): { avant: string[]; apres: string[] } {
  const [avant = "", ...suite] = phrase.split(TROU);

  if (suite.length === 0) return { avant: [], apres: [] };

  return { avant: mots(avant).reverse(), apres: mots(suite.join(TROU)) };
}

function memesMots(gauche: readonly string[], droite: readonly string[]): boolean {
  return (
    gauche.length === droite.length &&
    gauche.every((mot, rang) => motNu(mot) === motNu(droite[rang] ?? ""))
  );
}

/**
 * Le plus long recouvrement avec le bord, pas le premier mot seul. Jamais tous
 * les mots, sinon la réponse serait vide.
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

/** À droite d'abord, puis à gauche sur ce qui reste. */
export function sansLesBordsDuTrou(phrase: string, terme: string): string {
  const { avant, apres } = bords(phrase);
  const retenus = mots(terme);

  const aDroite = recouvrement(retenus, apres, (suite, k) => suite.slice(suite.length - k));
  const sansLaDroite = retenus.slice(0, retenus.length - aDroite);

  // Le bord gauche se lit à reculons : la tête du terme est retournée pour suivre.
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
 * La forme longue reste acceptée, elle est juste. Les leurres sont rognés aussi,
 * sans quoi le terme juste se repérerait à sa forme.
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
