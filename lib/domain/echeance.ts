import { dayToUtcDate, localDay } from "./local-day";

const MS_PAR_JOUR = 24 * 60 * 60 * 1000;

/**
 * Lecture d'une échéance. « Aujourd'hui » et « demain » se disent dans le
 * calendrier de l'utilisateur : chaque instant est ramené à son jour civil
 * avant de compter. Le stockage et la planification restent en UTC.
 */

/** Nombre de jours civils entre deux instants, vus depuis un fuseau donné. */
function ecartEnJoursCivils(depuis: Date, jusqua: Date, fuseau: string): number {
  const a = dayToUtcDate(localDay(depuis, fuseau)).getTime();
  const b = dayToUtcDate(localDay(jusqua, fuseau)).getTime();

  // Deux minuits UTC : la division est exacte, l'arrondi absorbe les flottants.
  return Math.round((b - a) / MS_PAR_JOUR);
}

/** Écart en jours civils. Négatif quand l'échéance est dépassée. */
export function joursAvant(echeance: Date, maintenant: Date, fuseau: string): number {
  return ecartEnJoursCivils(maintenant, echeance, fuseau);
}

/**
 * Un écart de calendrier, prêt à être dit dans une langue. Le domaine décide du
 * palier (jours, puis mois à partir de trente), les messages `temps.delai` et
 * `temps.anciennete` décident des mots.
 *
 * `nombre` vaut zéro pour « aujourd'hui », un pour « demain » ou « hier ».
 */
export type Duree = { unite: "jour" | "mois"; nombre: number };

function enDuree(jours: number): Duree {
  if (jours <= 0) return { unite: "jour", nombre: 0 };
  if (jours < 30) return { unite: "jour", nombre: jours };
  if (jours < 60) return { unite: "mois", nombre: 1 };

  return { unite: "mois", nombre: Math.round(jours / 30) };
}

/**
 * Le délai avant une échéance à venir : « demain », « dans 3 jours ».
 *
 * Une échéance passée se dit « aujourd'hui » : elle est due, et annoncer un
 * retard serait un reproche.
 */
export function delaiAvant(echeance: Date, maintenant: Date, fuseau: string): Duree {
  return enDuree(joursAvant(echeance, maintenant, fuseau));
}

/**
 * Le même délai, vers un jour civil déjà connu : le prochain passage d'un
 * concept, qui n'est pas toujours son échéance (voir `jourOuIlRevient`).
 */
export function delaiAvantLeJour(jour: string, maintenant: Date, fuseau: string): Duree {
  const vise = dayToUtcDate(jour).getTime();
  const aujourdhui = dayToUtcDate(localDay(maintenant, fuseau)).getTime();

  return enDuree(Math.round((vise - aujourdhui) / MS_PAR_JOUR));
}

/** Depuis quand, pour une ligne de texte : « hier », « il y a 6 jours ». */
export function anciennete(instant: Date, maintenant: Date, fuseau: string): Duree {
  return enDuree(Math.max(0, ecartEnJoursCivils(instant, maintenant, fuseau)));
}
