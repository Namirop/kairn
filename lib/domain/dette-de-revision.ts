import { jourSuivant } from "./local-day";

/**
 * Quand quelqu'un dépose plus vite qu'il ne révise.
 *
 * Ce n'est pas une alerte et surtout pas un reproche : c'est un constat, avec sa
 * sortie. L'arriéré qui dépasse le plafond de session un jour ne veut rien dire
 * — on a été occupé. Le même arriéré plusieurs jours d'affilée veut dire que le
 * rythme de dépôt et le rythme de révision ne se rejoindront pas tout seuls, et
 * personne ne s'en aperçoit en regardant un compteur qui monte lentement.
 *
 * Le message disparaît dès que l'arriéré redescend. Une bannière permanente
 * devient un élément de décor, et on cesse de la lire au moment précis où elle
 * aurait quelque chose à dire.
 */

/**
 * Jours consécutifs d'arriéré avant de le dire.
 *
 * Deux, c'est du bruit : un week-end sauté suffit. Trois est le premier nombre
 * qui distingue un creux d'une tendance.
 */
export const JOURS_AVANT_SIGNAL = 3;

/**
 * Le suivi de l'arriéré, tel qu'il est conservé d'un jour à l'autre.
 *
 * Un seul jour civil suffit à tout dire : celui où l'arriéré a commencé à
 * dépasser. Le nombre de jours s'en déduit, et il n'y a rien à incrémenter —
 * donc rien à désynchroniser si la personne ne passe pas un jour.
 */
export type SuiviDeLArriere = { depuis: string | null };

/**
 * Le suivi après une observation.
 *
 * Il ne bouge que quand l'état change : l'arriéré s'installe, ou il se résorbe.
 * Un arriéré qui dure ne réécrit rien, ce qui rend l'appel sans effet la plupart
 * du temps — et évite d'écrire à chaque affichage du tableau de bord.
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
 * fait 23 ou 25 heures aux changements d'heure, et l'étiquette, elle, avance
 * toujours d'un cran.
 */
export function joursDArriere(suivi: SuiviDeLArriere, jour: string): number {
  if (suivi.depuis === null || suivi.depuis > jour) return 0;

  let compte = 1;
  let curseur = suivi.depuis;

  // Borné par construction : on s'arrête au jour observé. La garde de sortie
  // couvre un suivi laissé dans le futur par une horloge qui a reculé.
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
