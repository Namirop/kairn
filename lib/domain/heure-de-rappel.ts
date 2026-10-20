import type { LangueDuProduit } from "./langue-du-produit";

/**
 * L'heure du rappel quotidien, en champ libre à lecture tolérante (« 8 »,
 * « 20 h 00 », « 7 pm »), les deux conventions dans les deux langues. Les
 * minutes ne sont acceptées qu'à zéro : l'envoi ne compare que l'heure, et
 * arrondir « 20 h 30 » en silence mentirait.
 */

export const HEURE_MIN = 0;
export const HEURE_MAX = 23;

const ECRITURE = /^(\d{1,2})\s*(?:h|:)?\s*(\d{2})?\s*(?:([ap])\.?\s*m\.?)?\s*$/i;

/** Midi est « 12 pm » et minuit « 12 am ». */
function depuisDouzeHeures(heure: number, apresMidi: boolean): number | null {
  if (heure < 1 || heure > 12) return null;

  const base = heure === 12 ? 0 : heure;

  return apresMidi ? base + 12 : base;
}

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
