import { jourSuivant } from "./jour-local";

/**
 * XP, niveaux et série. Rien ne mesure la justesse : punir l'échec pousse à
 * éviter les sujets durs et à s'auto-noter large. L'entraînement ne rapporte
 * rien, pour ne pas devenir plus attirant que la session.
 */

/** L'unité : être venu, pas avoir eu bon. */
export const XP_PAR_PASSAGE = 1;

/**
 * Raté au passage précédent, retrouvé maintenant. Rater ne coûte jamais rien,
 * sans quoi la meilleure stratégie serait de ne réviser que le facile.
 */
export const XP_DE_RATTRAPAGE = 1;

/** Du niveau 1 au 2 ; chaque palier ajoute autant. */
export const XP_DU_PREMIER_PALIER = 20;

/** `ratePrecedemment` regarde le passage d'avant sur ce concept, pas celui-ci. */
export function xpDuPassage(ratePrecedemment: boolean, reussiMaintenant: boolean): number {
  return XP_PAR_PASSAGE + (ratePrecedemment && reussiMaintenant ? XP_DE_RATTRAPAGE : 0);
}

/** Cumulée, en somme arithmétique : 20 pour le niveau 2, 40 de plus pour le 3. */
export function xpDuNiveau(niveau: number): number {
  const rang = Math.max(1, Math.floor(niveau));

  return (XP_DU_PREMIER_PALIER * rang * (rang - 1)) / 2;
}

export type Progression = {
  niveau: number;
  /** XP posée au pied du niveau courant. */
  seuilDuNiveau: number;
  /** XP qu'il faudra pour le suivant. */
  seuilSuivant: number;
};

/** Les boucles corrigent la racine flottante, qui peut tomber du mauvais côté d'un palier. */
export function progressionPourXp(xp: number): Progression {
  const acquis = Math.max(0, Math.floor(xp));
  let niveau = Math.max(
    1,
    Math.floor((1 + Math.sqrt(1 + (8 * acquis) / XP_DU_PREMIER_PALIER)) / 2),
  );

  while (xpDuNiveau(niveau + 1) <= acquis) niveau += 1;
  while (niveau > 1 && xpDuNiveau(niveau) > acquis) niveau -= 1;

  return { niveau, seuilDuNiveau: xpDuNiveau(niveau), seuilSuivant: xpDuNiveau(niveau + 1) };
}

export type AvancementDuNiveau = {
  niveau: number;
  /** Entre 0 et 1. */
  part: number;
  restant: number;
};

export function avancementDuNiveau(xp: number): AvancementDuNiveau {
  const acquis = Math.max(0, Math.floor(xp));
  const { niveau, seuilDuNiveau, seuilSuivant } = progressionPourXp(acquis);
  const palier = seuilSuivant - seuilDuNiveau;

  // Impossible avec cette courbe, mais NaN rendrait une barre invisible.
  if (palier <= 0) return { niveau, part: 1, restant: 0 };

  return {
    niveau,
    part: Math.min(1, Math.max(0, (acquis - seuilDuNiveau) / palier)),
    restant: Math.max(0, seuilSuivant - acquis),
  };
}

/**
 * La série compte les rendez-vous tenus, pas les jours. Il faut un jour sauté
 * (revenir le lendemain ne manque rien, même après une session qui a débordé du
 * plafond) et une échéance en attente pendant le trou. Les `AAAA-MM-JJ` se
 * comparent dans l'ordre lexicographique, qui est chronologique.
 */
export function unRendezVousManque(
  joursDEcheance: string[],
  dernierJour: string,
  jour: string,
): boolean {
  if (jourSuivant(dernierJour) === jour) return false;

  return joursDEcheance.some((echeance) => echeance < jour);
}

/**
 * Les jours sont des étiquettes, jamais des instants : 23 h 50 puis 00 h 10 font
 * deux jours. Un trou ne casse la série que si quelque chose attendait : on
 * demande de revenir quand on est appelé, pas tous les jours.
 */
export function serieApresPassage(
  dernierJour: string | null,
  jour: string,
  serieActuelle: number,
  rendezVousManque = false,
): number {
  if (dernierJour === jour) return Math.max(1, serieActuelle);
  if (dernierJour === null || dernierJour > jour) return 1;

  return rendezVousManque ? 1 : Math.max(1, serieActuelle) + 1;
}
