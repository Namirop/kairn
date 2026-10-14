import { aplati } from "./texte-aplati";
import { tirageDe } from "./tirage-deterministe";

/**
 * Le coup de pouce d'un texte à trou : ce qu'on montre, et ce qu'il coûte.
 *
 * Sans aide, un terme exact qui ne vient pas enregistre un échec complet là où
 * il y avait un rappel partiel. Trois ou quatre pistes réduisent le champ sans
 * donner la réponse.
 *
 * L'aide fait descendre la note d'un cran : sans ce prix, elle deviendrait le
 * geste par défaut et la mémoire enregistrerait de fausses réussites.
 */

/** Au-delà, on ne réduit plus le champ, on donne une liste à parcourir. */
const PISTES_MAXIMUM = 4;

/**
 * En deçà, l'aide est un vrai ou faux déguisé, gagné une fois sur deux sans
 * rien savoir : il faut au moins deux leurres à côté du terme attendu.
 */
const PISTES_MINIMUM = 3;

/** Minuscules, sans accents : deux formes du même mot ne s'affichent pas deux fois. */
function cleDuTerme(terme: string): string {
  return aplati(terme).trim();
}

/**
 * Les termes proposés à qui sèche, dans un ordre stable.
 *
 * Le terme attendu est mélangé aux leurres par un tirage dérivé de la graine
 * (l'identifiant de la question) : sinon il serait toujours au même rang, et
 * une même question doit s'afficher pareil d'une fois à l'autre.
 *
 * Un leurre qui redit le terme attendu est retiré (deux bonnes réponses).
 * Vide quand il n'y a pas de quoi réduire honnêtement le champ.
 */
export function pistesDuTrou(
  attendu: string,
  leurres: readonly string[],
  graine: string,
): string[] {
  const propre = attendu.trim();

  if (propre.length === 0) return [];

  const vus = new Set([cleDuTerme(propre)]);
  const retenus = [propre];

  for (const leurre of leurres) {
    const candidat = leurre.trim();

    if (candidat.length === 0 || vus.has(cleDuTerme(candidat))) continue;

    vus.add(cleDuTerme(candidat));
    retenus.push(candidat);

    if (retenus.length === PISTES_MAXIMUM) break;
  }

  if (retenus.length < PISTES_MINIMUM) return [];

  const tirage = tirageDe(graine);
  const restants = [...retenus];
  const ordre: string[] = [];

  while (restants.length > 0) {
    ordre.push(...restants.splice(Math.floor(tirage() * restants.length), 1));
  }

  return ordre;
}

/**
 * La note d'un passage, un cran plus bas si l'aide a été demandée : retrouver
 * le terme parmi quatre reste un rappel, plus facile.
 *
 * `EASY` n'apparaît pas sur ce format (réservé à la sortie du cycle), mais il
 * descend aussi, pour ne pas laisser passer un cas imprévu.
 */
export type NoteDeTrou = "AGAIN" | "HARD" | "GOOD" | "EASY";

const UN_CRAN_PLUS_BAS: Record<NoteDeTrou, NoteDeTrou> = {
  EASY: "GOOD",
  GOOD: "HARD",
  HARD: "AGAIN",
  AGAIN: "AGAIN",
};

export function noteApresAide(note: NoteDeTrou, aideDemandee: boolean): NoteDeTrou {
  return aideDemandee ? UN_CRAN_PLUS_BAS[note] : note;
}
