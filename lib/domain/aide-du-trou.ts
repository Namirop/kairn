import { aplati } from "./texte-aplati";
import { tirageDe } from "./tirage-deterministe";

/**
 * Le coup de pouce d'un texte à trou. Sans aide, un terme qui ne vient pas
 * enregistre un échec complet là où il y avait un rappel partiel. L'aide coûte
 * un cran de note, sinon elle deviendrait le geste par défaut.
 */

/** Au-delà, on ne réduit plus le champ, on donne une liste à parcourir. */
const PISTES_MAXIMUM = 4;

/** En deçà, l'aide est un vrai ou faux déguisé : au moins deux leurres. */
const PISTES_MINIMUM = 3;

/** Minuscules, sans accents : deux formes du même mot ne s'affichent pas deux fois. */
function cleDuTerme(terme: string): string {
  return aplati(terme).trim();
}

/**
 * Mélangés par la graine (l'id de la question) : l'attendu ne tombe pas toujours
 * au même rang, et la question s'affiche pareil d'une fois à l'autre. Vide quand
 * il n'y a pas de quoi réduire honnêtement le champ.
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
 * Retrouver le terme parmi trois ou quatre reste un rappel, plus facile : un cran plus
 * bas. `EASY` n'apparaît pas sur ce format mais descend aussi, par prudence.
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
