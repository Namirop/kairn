import { jourEnDateUtc } from "./jour-local";

/**
 * Quand le compteur repart : au jour d'ancrage de la période (le 12 pour qui
 * s'est inscrit un 12), pas à minuit.
 */

const JOUR_MS = 24 * 60 * 60 * 1000;

/** Jours pleins entre aujourd'hui et le basculement, dans le calendrier local. */
export function joursAvantLaBascule(aujourdhui: string, finDePeriode: string): number {
  return Math.max(
    0,
    Math.round(
      (jourEnDateUtc(finDePeriode).getTime() - jourEnDateUtc(aujourdhui).getTime()) / JOUR_MS,
    ),
  );
}

/**
 * Le moment de la remise à zéro, prêt à être dit.
 *
 * Une échéance proche se compte en jours, une lointaine se nomme : « le 12
 * septembre » situe mieux que « dans 26 jours ». Le domaine choisit la forme ;
 * les mots sont dans `temps.remiseAZero`, la date se formate à l'écran.
 */
export type RemiseAZero =
  | { quand: "instant" }
  | { quand: "jours"; nombre: number }
  /** Le jour civil de la bascule, `AAAA-MM-JJ`. */
  | { quand: "date"; jour: string };

export function quandRepartLeCompteur(aujourdhui: string, finDePeriode: string): RemiseAZero {
  const jours = joursAvantLaBascule(aujourdhui, finDePeriode);

  if (jours <= 0) return { quand: "instant" };
  if (jours <= 7) return { quand: "jours", nombre: jours };

  return { quand: "date", jour: finDePeriode };
}
