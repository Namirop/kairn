import type { LangueDuProduit } from "./langue-du-produit";

/**
 * L'heure du rappel quotidien, telle qu'on l'écrit : un champ libre à lecture
 * tolérante (« 8 », « 08:00 », « 20 h 00 », « 7 pm »).
 *
 * Les minutes ne sont acceptées qu'à zéro : l'envoi ne compare que l'heure
 * locale du compte à celle du réglage, donc « 20 h 30 » ne pourrait pas être
 * tenu, et l'arrondir en silence mentirait.
 *
 * La lecture accepte les deux conventions dans les deux langues ; seule
 * l'écriture suit la langue de l'écran.
 */

export const HEURE_MIN = 0;
export const HEURE_MAX = 23;

/**
 * Chiffres, un séparateur facultatif — `h` ou `:` —, des minutes facultatives,
 * puis un `am` ou `pm` facultatif, points compris (« p.m. »).
 */
const ECRITURE = /^(\d{1,2})\s*(?:h|:)?\s*(\d{2})?\s*(?:([ap])\.?\s*m\.?)?\s*$/i;

/**
 * L'heure sur vingt-quatre heures, depuis une heure sur douze. Midi est
 * « 12 pm » et minuit « 12 am » : le piège classique d'une demi-journée.
 */
function depuisDouzeHeures(heure: number, apresMidi: boolean): number | null {
  if (heure < 1 || heure > 12) return null;

  const base = heure === 12 ? 0 : heure;

  return apresMidi ? base + 12 : base;
}

/** L'heure lue, ou `null` si ce qui est écrit n'en désigne pas une. */
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

/** L'heure relue dans le champ : « 19 h » en français, « 7 pm » en anglais. */
export function ecrireHeureDeRappel(heure: number, langue: LangueDuProduit): string {
  const bornee = Math.min(Math.max(Math.floor(heure), HEURE_MIN), HEURE_MAX);

  if (langue === "FR") return `${bornee} h`;

  const surDouze = bornee % 12 === 0 ? 12 : bornee % 12;

  return `${surDouze} ${bornee < 12 ? "am" : "pm"}`;
}
