import { dayToUtcDate, localDay } from "./local-day";

const MS_PAR_JOUR = 24 * 60 * 60 * 1000;

/**
 * Lecture d'une échéance.
 *
 * « aujourd'hui » et « demain » sont des affirmations sur le calendrier de
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

/**
 * Un écart de calendrier, prêt à être dit dans une langue.
 *
 * Le domaine décide du palier — des jours jusqu'à un mois, des mois au-delà —,
 * l'écran décide des mots. « dans 3 jours » et « in 3 days » partagent la même
 * règle de bascule ; seule la phrase change, et elle vit dans les messages
 * (`temps.delai`, `temps.anciennete`).
 *
 * `nombre` vaut zéro pour « aujourd'hui », un pour « demain » ou « hier ».
 */
export type Duree = { unite: "jour" | "mois"; nombre: number };

function enDuree(jours: number): Duree {
  if (jours <= 0) return { unite: "jour", nombre: 0 };
  if (jours < 30) return { unite: "jour", nombre: jours };
  if (jours < 60) return { unite: "mois", nombre: 1 };

  return { unite: "mois", nombre: Math.round(jours / 30) };
}

/**
 * Le délai avant une échéance à venir : « demain », « dans 3 jours ».
 *
 * Une échéance déjà passée se dit « aujourd'hui » : elle est due maintenant, et
 * annoncer un retard à quelqu'un qui vient de finir sa session serait lui
 * reprocher ce qu'il vient de faire.
 */
export function delaiAvant(echeance: Date, maintenant: Date, fuseau: string): Duree {
  return enDuree(joursAvant(echeance, maintenant, fuseau));
}

/**
 * Le même délai, quand on tient déjà le jour civil visé.
 *
 * Le prochain passage d'un concept n'est pas toujours son échéance : celui qui
 * vient d'être revu porte une échéance encore aujourd'hui et ne reviendra que
 * demain. C'est ce jour-là qu'on annonce, et il se calcule ailleurs — ici on ne
 * fait que le mesurer.
 */
export function delaiAvantLeJour(jour: string, maintenant: Date, fuseau: string): Duree {
  const vise = dayToUtcDate(jour).getTime();
  const aujourdhui = dayToUtcDate(localDay(maintenant, fuseau)).getTime();

  return enDuree(Math.round((vise - aujourdhui) / MS_PAR_JOUR));
}

/** Depuis quand, pour une ligne de texte : « hier », « il y a 6 jours ». */
export function anciennete(instant: Date, maintenant: Date, fuseau: string): Duree {
  return enDuree(Math.max(0, ecartEnJoursCivils(instant, maintenant, fuseau)));
}
