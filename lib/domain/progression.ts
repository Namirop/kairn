import { jourSuivant } from "./local-day";

/**
 * Ce que la progression compte, et ce qu'elle refuse de compter.
 *
 * **Rien ici ne mesure la justesse.** Dans un système de répétition espacée,
 * tomber sur ce qu'on rate est le moment où l'apprentissage se produit : un
 * score qui punit l'échec pousse à éviter les sujets durs, et à s'auto-noter
 * généreusement sur les formats libres — où la note est déclarative, donc
 * invérifiable. On compte l'effort et la consolidation, qui ne se trichent pas.
 *
 * L'entraînement libre ne donne rien non plus. Il n'entre déjà ni dans la
 * planification, ni dans la rotation, ni dans le signal de maîtrise ; lui donner
 * un compteur rouvrirait par la porte de service ce qu'on a fermé en 3.5.
 */

/** Un passage en session du jour. C'est l'unité : être venu, pas avoir eu bon. */
export const XP_PAR_PASSAGE = 1;

/**
 * Ce que vaut un concept raté au passage précédent et retrouvé maintenant.
 *
 * C'est le seul endroit où le résultat compte, et il ne compte que dans un sens :
 * il récompense d'être revenu sur ce qui avait échoué. Rater ne coûte jamais
 * rien — sans quoi la meilleure stratégie serait de ne réviser que le facile.
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
 * L'XP cumulée qu'il faut pour atteindre un niveau.
 *
 * Somme arithmétique : le niveau 2 coûte 20, le 3 en coûte 40 de plus, le 4
 * encore 60. La courbe s'aplatit parce que chaque palier est plus cher que le
 * précédent — un compteur qui avance à vitesse constante finit par ne plus rien
 * signifier, et un qui accélère ment sur ce qui reste à faire.
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
 * L'estimation part de l'inverse de la somme arithmétique, puis se corrige d'un
 * cran s'il le faut : la racine carrée d'un grand nombre flottant n'atterrit pas
 * toujours du bon côté d'un palier, et un niveau qui saute d'une unité selon la
 * précision de la machine serait pire qu'une boucle.
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
 * Où l'on en est *dans* son niveau.
 *
 * « Niveau 2 · 34 XP » dit ce qui est acquis et rien de ce qui vient : deux
 * chiffres qu'on ne peut situer l'un par rapport à l'autre, donc rien à quoi se
 * raccrocher. Ce qui motive est la part parcourue et ce qu'il reste, pas le
 * cumul. Les paliers étant de plus en plus chers, la part ne se devine pas non
 * plus — elle se calcule, et c'est ici.
 */
export function avancementDuNiveau(xp: number): AvancementDuNiveau {
  const acquis = Math.max(0, Math.floor(xp));
  const { niveau, seuilDuNiveau, seuilSuivant } = progressionPourXp(acquis);
  const palier = seuilSuivant - seuilDuNiveau;

  // Un palier de largeur nulle n'existe pas dans la courbe actuelle, mais une
  // division par zéro rendrait NaN et une barre de progression invisible : on
  // préfère un palier plein à un écran cassé.
  if (palier <= 0) return { niveau, part: 1, restant: 0 };

  return {
    niveau,
    part: Math.min(1, Math.max(0, (acquis - seuilDuNiveau) / palier)),
    restant: Math.max(0, seuilSuivant - acquis),
  };
}

/**
 * Un jour où quelque chose attendait est-il passé sans personne ?
 *
 * C'est la question que la série pose vraiment. Elle ne compte pas les jours du
 * calendrier : elle compte les rendez-vous tenus. Un jour sans personne alors que
 * quelque chose attendait est un rendez-vous manqué ; une journée où rien
 * n'attendait n'en est pas un, et n'a rien à casser.
 *
 * Deux conditions, et il faut les deux. **Un jour est passé sans personne** —
 * revenir le lendemain ne manque jamais rien, quoi qu'on ait laissé derrière soi.
 * C'est ce qui fait qu'une session trop chargée ne casse pas la série du
 * lendemain : ce qui a débordé du plafond attendait, mais on est venu. **Et
 * quelque chose attendait ce jour-là** : une échéance antérieure à aujourd'hui
 * était en attente pendant tout le trou, qu'elle y soit tombée ou qu'elle traînait
 * déjà. Une échéance d'aujourd'hui, elle, n'attendait pas hier.
 *
 * Les échéances données sont des jours civils de l'utilisateur, et la comparaison
 * est lexicographique — sur des étiquettes `AAAA-MM-JJ`, c'est l'ordre
 * chronologique, sans repasser par un fuseau.
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
 * Les jours sont comparés comme des étiquettes `AAAA-MM-JJ` et jamais comme des
 * instants : c'est ce qui fait qu'une révision à 23 h 50 puis une à 00 h 10
 * comptent deux jours, et ce qui rend le calcul insensible aux changements
 * d'heure. Une seule révision suffit à tenir la série — le but est de revenir,
 * pas de tout finir.
 *
 * Ce que la série compte, ce sont les passages consécutifs sans en manquer un, et
 * non les jours consécutifs. Un trou dans le calendrier ne la casse que si
 * quelque chose attendait pendant ce trou : quelqu'un qui est à jour et dont rien
 * ne revient pendant trois jours ne perd rien, parce qu'il n'y avait rien à
 * perdre. L'inverse punissait exactement le comportement que le produit demande —
 * revenir quand on est appelé, et pas plus.
 *
 * Revenir le lendemain suffit toujours, quoi qu'on ait laissé derrière soi : une
 * session qu'on n'a pas finie, ou ce qui a débordé de son plafond, ne se retourne
 * jamais contre celui qui revient.
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
