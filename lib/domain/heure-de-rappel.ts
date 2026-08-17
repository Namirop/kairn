/**
 * L'heure du rappel quotidien, telle qu'on l'écrit.
 *
 * Un seul champ et une lecture tolérante, plutôt qu'une liste de vingt-quatre
 * choix : « 8 », « 8h », « 08:00 » et « 20 h 00 » désignent tous une heure, et
 * personne ne devrait avoir à deviner laquelle des formes est attendue.
 *
 * Les minutes sont lues mais pas acceptées ailleurs qu'à zéro. Le passage qui
 * envoie est horaire — il compare l'heure locale de chaque compte à celle de son
 * réglage — donc « 20 h 30 » ne pourrait pas être tenu. Le refuser dit la vérité ;
 * l'arrondir en silence promettrait une précision qui n'existe pas.
 */

export const HEURE_MIN = 0;
export const HEURE_MAX = 23;

/** Chiffres, un séparateur facultatif — `h` ou `:` —, des minutes facultatives. */
const ECRITURE = /^(\d{1,2})\s*(?:h|:)?\s*(\d{2})?\s*$/i;

/**
 * L'heure lue, ou `null` si ce qui est écrit n'en désigne pas une.
 *
 * `null` et non une exception : l'appelant est un formulaire, et il a un message
 * à afficher plutôt qu'une panne à propager.
 */
export function lireHeureDeRappel(saisie: string): number | null {
  const trouve = ECRITURE.exec(saisie.trim());

  if (!trouve) return null;

  const heure = Number.parseInt(trouve[1] ?? "", 10);
  const minutes = trouve[2] === undefined ? 0 : Number.parseInt(trouve[2], 10);

  if (Number.isNaN(heure) || heure < HEURE_MIN || heure > HEURE_MAX) return null;
  if (minutes !== 0) return null;

  return heure;
}

/** L'heure telle qu'on la relit dans le champ : « 19 h », jamais « 19:00 ». */
export function ecrireHeureDeRappel(heure: number): string {
  return `${Math.min(Math.max(Math.floor(heure), HEURE_MIN), HEURE_MAX)} h`;
}
