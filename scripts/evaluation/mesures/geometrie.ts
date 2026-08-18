import type { Vecteur } from "./espace";

/**
 * La géométrie des mesures : une similarité, et deux façons de la parcourir.
 *
 * Tout le reste du banc en découle. Les quatre signaux ne sont que quatre
 * lectures de ces trois fonctions — chaque phrase vers son concept le plus
 * proche, chaque concept vers sa phrase la plus proche, et les paires d'un même
 * ensemble triées. C'est ce qui rend les candidats mécaniques : aucune opinion
 * n'entre ici, seulement des cosinus.
 *
 * Le cosinus est calculé en entier, normes comprises, alors que Voyage rend des
 * vecteurs déjà unitaires et qu'un produit scalaire suffirait. La différence est
 * invisible sur la facture et le jour où le fournisseur change, ou qu'on
 * tronque une dimension, la mesure reste juste.
 */

/** Deux vecteurs identiques rendent 1, deux vecteurs opposés −1. */
export function cosinus(un: Vecteur, deux: Vecteur): number {
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

  // Un vecteur nul n'a pas de direction : sa similarité n'est pas zéro, elle
  // n'existe pas. Rendre 0 serait dire « orthogonal », ce qui est faux.
  if (normes === 0) return Number.NaN;

  // Le calcul flottant peut sortir de [−1, 1] d'un cheveu sur deux vecteurs
  // colinéaires ; un `Math.acos` en aval y perdrait la tête.
  return Math.min(1, Math.max(-1, produit / normes));
}

export type PlusProche = { rang: number; proximite: number };

/**
 * Le candidat le plus proche d'un vecteur, et sa proximité.
 *
 * `null` sur un ensemble vide : un dépôt sans concept n'a pas une couverture de
 * zéro, il n'en a pas. Les deux se confondraient dans une moyenne.
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

export type PaireProche = { un: number; deux: number; proximite: number };

/**
 * Toutes les paires d'un même ensemble, triées de la plus proche à la plus
 * lointaine. Chaque paire une seule fois, jamais un élément avec lui-même.
 *
 * L'ordre du tri est ce qui permet de calibrer sans seuil : on regarde la tête
 * de liste et on décide où s'arrête la ressemblance.
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

/** La médiane d'une série. `null` sur une série vide, pour la raison dite plus haut. */
export function mediane(valeurs: number[]): number | null {
  if (valeurs.length === 0) return null;

  const tries = [...valeurs].sort((a, b) => a - b);
  const milieu = Math.floor(tries.length / 2);

  if (tries.length % 2 === 1) return tries[milieu] ?? null;

  const avant = tries[milieu - 1] ?? 0;
  const apres = tries[milieu] ?? 0;

  return (avant + apres) / 2;
}

/**
 * Les déciles d'une série, du plus bas au plus haut, bornes comprises.
 *
 * C'est la forme qui sert à poser un plancher : la médiane dit où se tient le
 * gros de la distribution, mais un seuil se place dans la queue, et c'est le
 * premier ou le dernier décile qui montre où elle commence.
 */
export function deciles(valeurs: number[]): number[] {
  if (valeurs.length === 0) return [];

  const tries = [...valeurs].sort((a, b) => a - b);

  return Array.from({ length: 11 }, (_, dixieme) => {
    const rang = Math.min(tries.length - 1, Math.round((dixieme / 10) * (tries.length - 1)));

    return tries[rang] ?? 0;
  });
}
