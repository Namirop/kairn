import { jourSuivant } from "./local-day";

/**
 * Quand quelqu'un dépose plus vite qu'il ne révise : un constat, pas un
 * reproche. Un jour d'arriéré ne veut rien dire ; plusieurs d'affilée disent que
 * les deux rythmes ne se rejoindront pas seuls.
 *
 * Le message disparaît dès que l'arriéré redescend : une bannière permanente
 * cesse d'être lue.
 */

/**
 * Jours consécutifs d'arriéré avant de le dire. À deux, un week-end sauté
 * suffit ; trois distingue un creux d'une tendance.
 */
export const JOURS_AVANT_SIGNAL = 3;

/**
 * Le suivi de l'arriéré : le jour civil où il a commencé. Le nombre de jours
 * s'en déduit ; sans compteur, rien à désynchroniser si la personne ne passe
 * pas un jour.
 */
export type SuiviDeLArriere = { depuis: string | null };

/**
 * Le suivi après une observation. Il ne change que quand l'arriéré s'installe ou
 * se résorbe, ce qui évite d'écrire à chaque affichage du tableau de bord.
 */
export function suiviApresObservation(
  suivi: SuiviDeLArriere,
  enArriere: boolean,
  jour: string,
): SuiviDeLArriere {
  if (!enArriere) return { depuis: null };

  return suivi.depuis === null ? { depuis: jour } : suivi;
}

/**
 * Depuis combien de jours l'arriéré dure, aujourd'hui compris.
 *
 * Compté sur les étiquettes de jour et non sur des instants : une journée locale
 * fait 23 ou 25 heures aux changements d'heure.
 */
export function joursDArriere(suivi: SuiviDeLArriere, jour: string): number {
  if (suivi.depuis === null || suivi.depuis > jour) return 0;

  let compte = 1;
  let curseur = suivi.depuis;

  // La garde de 400 couvre un suivi laissé dans le futur par une horloge qui a
  // reculé.
  while (curseur !== jour && compte < 400) {
    curseur = jourSuivant(curseur);
    compte += 1;
  }

  return compte;
}

/** Faut-il le dire ? Seulement au-delà du seuil, et seulement tant qu'il dure. */
export function doitSignalerLaDette(
  suivi: SuiviDeLArriere,
  enArriere: boolean,
  jour: string,
  seuil: number = JOURS_AVANT_SIGNAL,
): boolean {
  return enArriere && joursDArriere(suivi, jour) >= seuil;
}
