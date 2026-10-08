import type { LangueDuProduit } from "./langue-du-produit";

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
 *
 * **La lecture ne dépend pas de la langue, l'écriture si.** En anglais l'heure se
 * dit sur douze heures — « 7 pm » —, et c'est ce que le champ montre à un
 * anglophone. La lecture, elle, accepte les deux façons partout : quelqu'un qui
 * tape « 19 h » dans l'interface anglaise, ou « 7 pm » dans la française, a écrit
 * une heure sans ambiguïté, et la refuser ne protégerait de rien.
 */

export const HEURE_MIN = 0;
export const HEURE_MAX = 23;

/**
 * Chiffres, un séparateur facultatif — `h` ou `:` —, des minutes facultatives,
 * puis un `am` ou `pm` facultatif, points compris (« p.m. »).
 */
const ECRITURE = /^(\d{1,2})\s*(?:h|:)?\s*(\d{2})?\s*(?:([ap])\.?\s*m\.?)?\s*$/i;

/**
 * L'heure sur vingt-quatre heures, depuis une heure sur douze.
 *
 * Midi s'écrit « 12 pm » et minuit « 12 am » : c'est le seul endroit où le
 * passage n'est pas une simple addition, et la source classique de décalage
 * d'une demi-journée.
 */
function depuisDouzeHeures(heure: number, apresMidi: boolean): number | null {
  if (heure < 1 || heure > 12) return null;

  const base = heure === 12 ? 0 : heure;

  return apresMidi ? base + 12 : base;
}

/**
 * L'heure lue, ou `null` si ce qui est écrit n'en désigne pas une.
 *
 * `null` et non une exception : l'appelant est un formulaire, et il a un message
 * à afficher plutôt qu'une panne à propager.
 */
export function lireHeureDeRappel(saisie: string): number | null {
  const trouve = ECRITURE.exec(saisie.trim());

  if (!trouve) return null;

  const lue = Number.parseInt(trouve[1] ?? "", 10);
  const minutes = trouve[2] === undefined ? 0 : Number.parseInt(trouve[2], 10);
  const moitie = trouve[3]?.toLowerCase();
  const heure = moitie === undefined ? lue : depuisDouzeHeures(lue, moitie === "p");

  if (heure === null || Number.isNaN(heure) || heure < HEURE_MIN || heure > HEURE_MAX) return null;
  if (minutes !== 0) return null;

  return heure;
}

/**
 * L'heure telle qu'on la relit dans le champ, dans la langue de l'écran.
 *
 * « 19 h » en français, jamais « 19:00 » ; « 7 pm » en anglais, jamais « 19 ».
 */
export function ecrireHeureDeRappel(heure: number, langue: LangueDuProduit): string {
  const bornee = Math.min(Math.max(Math.floor(heure), HEURE_MIN), HEURE_MAX);

  if (langue === "FR") return `${bornee} h`;

  const surDouze = bornee % 12 === 0 ? 12 : bornee % 12;

  return `${surDouze} ${bornee < 12 ? "am" : "pm"}`;
}
