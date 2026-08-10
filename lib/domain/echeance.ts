import { dayToUtcDate, localDay } from "./local-day";

const MS_PAR_JOUR = 24 * 60 * 60 * 1000;

/**
 * Lecture d'une échéance.
 *
 * « auj. » et « −2 j » sont des affirmations sur le calendrier de
 * l'utilisateur, pas sur l'horloge UTC : à 00 h 30 à Paris on est déjà demain
 * chez soi et encore hier en UTC. Ces fonctions ramènent donc chaque instant à
 * son jour civil dans le fuseau de l'utilisateur avant de compter.
 *
 * Le stockage et la planification, eux, restent en UTC — c'est la lecture qui
 * est locale, pas le modèle de données.
 */

/** Nombre de jours civils entre deux instants, vus depuis un fuseau donné. */
function ecartEnJoursCivils(depuis: Date, jusqua: Date, fuseau: string): number {
  const a = dayToUtcDate(localDay(depuis, fuseau)).getTime();
  const b = dayToUtcDate(localDay(jusqua, fuseau)).getTime();

  // Les deux bornes sont des minuits UTC : la division est exacte, l'arrondi ne
  // sert qu'à absorber le bruit des flottants.
  return Math.round((b - a) / MS_PAR_JOUR);
}

/** Écart en jours civils. Négatif quand l'échéance est dépassée. */
export function joursAvant(echeance: Date, maintenant: Date, fuseau: string): number {
  return ecartEnJoursCivils(maintenant, echeance, fuseau);
}

/** Forme courte, pour une colonne de données : « auj. », « 5 j », « −3 j ». */
export function echeanceCourte(echeance: Date, maintenant: Date, fuseau: string): string {
  const jours = joursAvant(echeance, maintenant, fuseau);

  if (jours === 0) return "auj.";
  if (jours < 0) return `−${Math.abs(jours)} j`;
  if (jours < 30) return `${jours} j`;

  return `${Math.round(jours / 30)} mois`;
}

/**
 * Forme en prose pour une échéance à venir : « demain », « dans 3 jours ».
 *
 * Une échéance déjà passée se dit « aujourd'hui » : elle est due maintenant, et
 * annoncer un retard à quelqu'un qui vient de finir sa session serait lui
 * reprocher ce qu'il vient de faire.
 */
export function delaiAvant(echeance: Date, maintenant: Date, fuseau: string): string {
  const jours = joursAvant(echeance, maintenant, fuseau);

  if (jours <= 0) return "aujourd'hui";
  if (jours === 1) return "demain";
  if (jours < 30) return `dans ${jours} jours`;
  if (jours < 60) return "dans un mois";

  return `dans ${Math.round(jours / 30)} mois`;
}

/** Forme en prose, pour une ligne de texte : « il y a 6 jours ». */
export function anciennete(instant: Date, maintenant: Date, fuseau: string): string {
  const jours = Math.max(0, ecartEnJoursCivils(instant, maintenant, fuseau));

  if (jours === 0) return "aujourd'hui";
  if (jours === 1) return "hier";
  if (jours < 30) return `il y a ${jours} jours`;
  if (jours < 60) return "il y a un mois";

  return `il y a ${Math.round(jours / 30)} mois`;
}
