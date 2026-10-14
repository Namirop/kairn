import type { Vecteur } from "./espace";

/**
 * La géométrie des mesures : une similarité et ses parcours. Les signaux du
 * banc n'en sont que des lectures, ce qui rend les candidats mécaniques.
 *
 * Le cosinus est calculé normes comprises alors que Voyage rend des vecteurs
 * unitaires : la mesure reste juste si le fournisseur change ou qu'on tronque
 * une dimension.
 */

/** Deux vecteurs identiques rendent 1, deux vecteurs opposés −1. */
export function cosinus(un: Vecteur, deux: Vecteur): number {
  // Un vecteur vide est un texte que Voyage a refusé (chaîne vide). NaN se
  // propage sans lever, et les filtres en aval l'écartent.
  if (un.length === 0 || deux.length === 0) return Number.NaN;

  if (un.length !== deux.length) {
    throw new Error(`Vecteurs de dimensions différentes : ${un.length} et ${deux.length}.`);
  }

  let produit = 0;
  let normeUn = 0;
  let normeDeux = 0;

  for (let rang = 0; rang < un.length; rang += 1) {
    const a = un[rang] ?? 0;
    const b = deux[rang] ?? 0;

    produit += a * b;
    normeUn += a * a;
    normeDeux += b * b;
  }

  const normes = Math.sqrt(normeUn) * Math.sqrt(normeDeux);

  // Un vecteur nul n'a pas de direction : rendre 0 dirait « orthogonal ».
  if (normes === 0) return Number.NaN;

  // Le flottant peut sortir de [−1, 1] d'un cheveu sur deux vecteurs
  // colinéaires, et un `Math.acos` en aval rendrait NaN.
  return Math.min(1, Math.max(-1, produit / normes));
}

export type PlusProche = { rang: number; proximite: number };

/**
 * Le candidat le plus proche d'un vecteur. `null` sur un ensemble vide : un
 * dépôt sans concept n'a pas une couverture de zéro, il n'en a pas, et les deux
 * se confondraient dans une moyenne.
 */
export function plusProche(vecteur: Vecteur, candidats: Vecteur[]): PlusProche | null {
  let meilleur: PlusProche | null = null;

  candidats.forEach((candidat, rang) => {
    const proximite = cosinus(vecteur, candidat);

    if (Number.isNaN(proximite)) return;
    if (meilleur === null || proximite > meilleur.proximite) meilleur = { rang, proximite };
  });

  return meilleur;
}

/**
 * Les `k` candidats les plus proches, du plus proche au moins proche. Pour le
 * juge d'attendus : la proximité désigne une poignée de concepts, le juge
 * tranche si l'un d'eux couvre l'idée, chiffres et conditions compris.
 */
export function plusProches(vecteur: Vecteur, candidats: Vecteur[], k: number): PlusProche[] {
  const toutes: PlusProche[] = [];

  candidats.forEach((candidat, rang) => {
    const proximite = cosinus(vecteur, candidat);

    if (!Number.isNaN(proximite)) toutes.push({ rang, proximite });
  });

  return toutes.sort((un, deux) => deux.proximite - un.proximite).slice(0, Math.max(0, k));
}

export type PaireProche = { un: number; deux: number; proximite: number };

/**
 * Les paires d'un ensemble, de la plus proche à la plus lointaine. Le tri
 * permet de calibrer sans seuil : on lit la tête de liste et on décide où
 * s'arrête la ressemblance.
 */
export function pairesTriees(vecteurs: Vecteur[]): PaireProche[] {
  const paires: PaireProche[] = [];

  for (let un = 0; un < vecteurs.length; un += 1) {
    for (let deux = un + 1; deux < vecteurs.length; deux += 1) {
      const gauche = vecteurs[un];
      const droite = vecteurs[deux];

      if (!gauche || !droite) continue;

      const proximite = cosinus(gauche, droite);

      if (!Number.isNaN(proximite)) paires.push({ un, deux, proximite });
    }
  }

  return paires.sort((a, b) => b.proximite - a.proximite);
}

/** `null` sur une série vide, pour la raison dite à `plusProche`. */
export function mediane(valeurs: number[]): number | null {
  if (valeurs.length === 0) return null;

  const tries = [...valeurs].sort((a, b) => a - b);
  const milieu = Math.floor(tries.length / 2);

  // Le tri tient `-0` et `0` pour égaux et garde leur ordre d'arrivée : sans
  // normaliser, le signe d'une médiane nulle dépendrait de l'ordre d'entrée.
  if (tries.length % 2 === 1) return sansZeroNegatif(tries[milieu] ?? 0);

  const avant = tries[milieu - 1] ?? 0;
  const apres = tries[milieu] ?? 0;

  return sansZeroNegatif((avant + apres) / 2);
}

function sansZeroNegatif(valeur: number): number {
  return valeur === 0 ? 0 : valeur;
}

/**
 * Les déciles d'une série, bornes comprises. C'est la forme qui sert à poser un
 * seuil : il se place dans la queue, que la médiane ne montre pas.
 */
export function deciles(valeurs: number[]): number[] {
  if (valeurs.length === 0) return [];

  const tries = [...valeurs].sort((a, b) => a - b);

  return Array.from({ length: 11 }, (_, dixieme) => {
    const rang = Math.min(tries.length - 1, Math.round((dixieme / 10) * (tries.length - 1)));

    return tries[rang] ?? 0;
  });
}
