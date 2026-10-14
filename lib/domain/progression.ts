import { jourSuivant } from "./jour-local";

/**
 * XP, niveaux et série.
 *
 * Rien ici ne mesure la justesse : un score qui punit l'échec pousse à éviter
 * les sujets durs et à s'auto-noter généreusement sur les formats libres. On
 * compte l'effort, qui ne se triche pas. L'entraînement ne rapporte rien : il
 * ne doit pas devenir plus attirant que la session.
 */

/** Un passage en session du jour. C'est l'unité : être venu, pas avoir eu bon. */
export const XP_PAR_PASSAGE = 1;

/**
 * Le bonus d'un concept raté au passage précédent et retrouvé maintenant. Le
 * résultat ne compte que dans ce sens : rater ne coûte jamais rien, sans quoi
 * la meilleure stratégie serait de ne réviser que le facile.
 */
export const XP_DE_RATTRAPAGE = 1;

/** Ce que coûte le passage du niveau 1 au niveau 2. Chaque palier ajoute autant. */
export const XP_DU_PREMIER_PALIER = 20;

/**
 * L'XP d'un passage en session.
 *
 * `ratePrecedemment` regarde le passage d'avant sur ce concept, pas celui-ci.
 */
export function xpDuPassage(ratePrecedemment: boolean, reussiMaintenant: boolean): number {
  return XP_PAR_PASSAGE + (ratePrecedemment && reussiMaintenant ? XP_DE_RATTRAPAGE : 0);
}

/**
 * L'XP cumulée qu'il faut pour atteindre un niveau : somme arithmétique, le
 * niveau 2 coûte 20, le 3 en coûte 40 de plus, le 4 encore 60.
 */
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

/**
 * Le niveau atteint avec cette XP.
 *
 * L'estimation inverse la somme arithmétique, puis les boucles la corrigent
 * d'un cran : la racine flottante n'atterrit pas toujours du bon côté d'un
 * palier.
 */
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
  /** Part du palier courant déjà parcourue, entre 0 et 1. */
  part: number;
  /** XP qu'il reste à gagner avant le palier suivant. */
  restant: number;
};

/**
 * Où l'on en est dans son niveau : la part parcourue et ce qu'il reste, que
 * le cumul seul ne permet pas de situer.
 */
export function avancementDuNiveau(xp: number): AvancementDuNiveau {
  const acquis = Math.max(0, Math.floor(xp));
  const { niveau, seuilDuNiveau, seuilSuivant } = progressionPourXp(acquis);
  const palier = seuilSuivant - seuilDuNiveau;

  // Impossible avec la courbe actuelle, mais une division par zéro rendrait
  // NaN et une barre invisible.
  if (palier <= 0) return { niveau, part: 1, restant: 0 };

  return {
    niveau,
    part: Math.min(1, Math.max(0, (acquis - seuilDuNiveau) / palier)),
    restant: Math.max(0, seuilSuivant - acquis),
  };
}

/**
 * Un jour où quelque chose attendait est-il passé sans personne ? La série
 * compte les rendez-vous tenus, pas les jours du calendrier.
 *
 * Il faut les deux conditions : un jour sauté (revenir le lendemain ne manque
 * jamais rien, même après une session qui a débordé du plafond), et une
 * échéance antérieure à aujourd'hui, donc en attente pendant le trou.
 *
 * Les échéances sont des jours civils `AAAA-MM-JJ` de l'utilisateur : l'ordre
 * lexicographique est l'ordre chronologique, sans repasser par un fuseau.
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
 * La série après un passage, dans le calendrier de l'utilisateur.
 *
 * Les jours sont des étiquettes `AAAA-MM-JJ`, jamais des instants : 23 h 50
 * puis 00 h 10 font deux jours, et les changements d'heure n'y font rien. Une
 * seule révision suffit à tenir la série.
 *
 * Un trou ne la casse que si quelque chose attendait (`unRendezVousManque`) :
 * le produit demande de revenir quand on est appelé, pas tous les jours.
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
