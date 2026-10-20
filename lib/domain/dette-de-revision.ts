import { jourSuivant } from "./jour-local";

/**
 * Quand quelqu'un dépose plus vite qu'il ne révise. Le message disparaît dès
 * que l'arriéré redescend : une bannière permanente cesse d'être lue.
 */

/** À deux, un week-end sauté suffit ; trois distingue un creux d'une tendance. */
export const JOURS_AVANT_SIGNAL = 3;

/** Le jour où l'arriéré a commencé, pas un compteur qui se désynchroniserait. */
export type SuiviDeLArriere = { depuis: string | null };

/** Change seulement quand l'arriéré s'installe ou se résorbe : pas d'écriture à chaque affichage. */
export function suiviApresObservation(
  suivi: SuiviDeLArriere,
  enArriere: boolean,
  jour: string,
): SuiviDeLArriere {
  if (!enArriere) return { depuis: null };

  return suivi.depuis === null ? { depuis: jour } : suivi;
}

/**
 * Aujourd'hui compris. Compté sur les étiquettes de jour : une journée locale
 * fait 23 ou 25 heures aux changements d'heure.
 */
export function joursDArriere(suivi: SuiviDeLArriere, jour: string): number {
  if (suivi.depuis === null || suivi.depuis > jour) return 0;

  let compte = 1;
  let curseur = suivi.depuis;

  // La garde de 400 couvre une étiquette mal formée, que `jourSuivant` ne
  // rejoindrait jamais.
  while (curseur !== jour && compte < 400) {
    curseur = jourSuivant(curseur);
    compte += 1;
  }

  return compte;
}

export function doitSignalerLaDette(
  suivi: SuiviDeLArriere,
  enArriere: boolean,
  jour: string,
  seuil: number = JOURS_AVANT_SIGNAL,
): boolean {
  return enArriere && joursDArriere(suivi, jour) >= seuil;
}
