const MS_PAR_JOUR = 24 * 60 * 60 * 1000;

/**
 * Lecture d'une échéance. Les calculs se font en UTC — le fuseau de
 * l'utilisateur ne sert qu'à savoir quel jour il est chez lui, pas à décaler
 * une échéance.
 */

function jourUtc(instant: Date): number {
  return Math.floor(instant.getTime() / MS_PAR_JOUR);
}

/** Écart en jours pleins. Négatif quand l'échéance est dépassée. */
export function joursAvant(echeance: Date, maintenant: Date): number {
  return jourUtc(echeance) - jourUtc(maintenant);
}

/** Forme courte, pour une colonne de données : « auj. », « 5 j », « −3 j ». */
export function echeanceCourte(echeance: Date, maintenant: Date): string {
  const jours = joursAvant(echeance, maintenant);

  if (jours === 0) return "auj.";
  if (jours < 0) return `−${Math.abs(jours)} j`;
  if (jours < 30) return `${jours} j`;

  return `${Math.round(jours / 30)} mois`;
}

/** Forme en prose, pour une ligne de texte : « il y a 6 jours ». */
export function anciennete(instant: Date, maintenant: Date): string {
  const jours = Math.max(0, -joursAvant(instant, maintenant));

  if (jours === 0) return "aujourd'hui";
  if (jours === 1) return "hier";
  if (jours < 30) return `il y a ${jours} jours`;
  if (jours < 60) return "il y a un mois";

  return `il y a ${Math.round(jours / 30)} mois`;
}
