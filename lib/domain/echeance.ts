import { jourEnDateUtc, jourLocal } from "./jour-local";

const MS_PAR_JOUR = 24 * 60 * 60 * 1000;

/**
 * Lecture d'une échéance. « Demain » se dit dans le calendrier de l'utilisateur :
 * chaque instant est ramené à son jour civil local avant de compter. Le stockage
 * et la planification restent en UTC.
 */

function ecartEnJoursCivils(depuis: Date, jusqua: Date, fuseau: string): number {
  const a = jourEnDateUtc(jourLocal(depuis, fuseau)).getTime();
  const b = jourEnDateUtc(jourLocal(jusqua, fuseau)).getTime();

  // Deux minuits UTC : la division est exacte, l'arrondi absorbe les flottants.
  return Math.round((b - a) / MS_PAR_JOUR);
}

/** Négatif quand l'échéance est dépassée. */
export function joursAvant(echeance: Date, maintenant: Date, fuseau: string): number {
  return ecartEnJoursCivils(maintenant, echeance, fuseau);
}

/**
 * Le domaine choisit le palier, les messages `temps.delai` et `temps.anciennete`
 * les mots. `nombre` vaut zéro pour « aujourd'hui », un pour « demain » ou « hier ».
 */
export type Duree = { unite: "jour" | "mois"; nombre: number };

function enDuree(jours: number): Duree {
  if (jours <= 0) return { unite: "jour", nombre: 0 };
  if (jours < 30) return { unite: "jour", nombre: jours };
  if (jours < 60) return { unite: "mois", nombre: 1 };

  return { unite: "mois", nombre: Math.round(jours / 30) };
}

/** Le prochain passage, qui n'est pas toujours l'échéance (voir `jourOuIlRevient`). */
export function delaiAvantLeJour(jour: string, maintenant: Date, fuseau: string): Duree {
  const vise = jourEnDateUtc(jour).getTime();
  const aujourdhui = jourEnDateUtc(jourLocal(maintenant, fuseau)).getTime();

  return enDuree(Math.round((vise - aujourdhui) / MS_PAR_JOUR));
}

export function anciennete(instant: Date, maintenant: Date, fuseau: string): Duree {
  return enDuree(Math.max(0, ecartEnJoursCivils(instant, maintenant, fuseau)));
}
