/**
 * Comment une session choisit, parmi ce que la rotation lui laisse, de quoi
 * varier les gestes de sa journée.
 *
 * La rotation choisit concept par concept, et à égalité c'est l'identifiant qui
 * tranchait. Or les variantes d'un concept naissent d'un même `createMany` : le
 * plus petit identifiant désigne partout la même position, donc souvent le même
 * format pour toute une session.
 *
 * Ce module ne choisit qu'à l'intérieur de l'ensemble que la rotation déclare
 * également bon : il n'affaiblit aucune règle de mémoire. Le format départage
 * avant la facette parce que c'est lui qui se voit à l'écran ; l'ordre reçu en
 * dernier.
 *
 * Déterministe : une session rechargée se recompose à l'identique.
 */

import { gesteDeReponse, type GesteDeReponse } from "./geste-de-reponse";

/**
 * Ce que coûte une question, compté en questions.
 *
 * Égaliser les formats à l'unité tire chacun vers le quart, et promeut donc
 * l'explication (environ 15 % de ce qui est écrit) au détriment du QCM. Or une
 * question qu'on formule et se note soi-même pèse bien plus qu'un choix. Elle
 * compte double : à l'équilibre elle retombe autour de sa part écrite, sans
 * disparaître.
 */
const COUT: Record<GesteDeReponse, number> = { CHOISIR: 1, SAISIR: 1, FORMULER: 2 };

function coutDe(format: string): number {
  return COUT[gesteDeReponse(format)];
}

/** Le strict nécessaire pour répartir : ce qui se voit, et ce qui se compte. */
export type VarianteRepartissable = {
  id: string;
  format: string;
  facet: string;
};

/**
 * Ce qu'un concept propose, dans l'ordre où la rotation les a rendues.
 *
 * Un tableau vide (concept sans question servable) ressort tel quel, pour que
 * l'appelant garde l'alignement avec sa propre liste.
 */
export type ChoixDunConcept<T extends VarianteRepartissable> = T[];

function moinsServi<T extends VarianteRepartissable>(
  candidates: T[],
  formats: Map<string, number>,
  facettes: Map<string, number>,
): T | undefined {
  return candidates.reduce<T | undefined>((meilleure, candidate) => {
    if (!meilleure) return candidate;

    const parFormat = (formats.get(candidate.format) ?? 0) - (formats.get(meilleure.format) ?? 0);

    if (parFormat !== 0) return parFormat < 0 ? candidate : meilleure;

    const parFacette = (facettes.get(candidate.facet) ?? 0) - (facettes.get(meilleure.facet) ?? 0);

    // À égalité, l'ordre de la rotation garde la main.
    return parFacette < 0 ? candidate : meilleure;
  }, undefined);
}

/**
 * Une variante par concept, choisies pour que la session ne se répète pas.
 *
 * Glouton, assumé : chaque concept, dans l'ordre reçu, sert le format le moins
 * vu jusque-là. Un optimum global ne se verrait pas à l'écran.
 *
 * L'ordre reçu compte donc : c'est à l'appelant de le rendre stable.
 */
export function repartirLesFormats<T extends VarianteRepartissable>(
  choix: ChoixDunConcept<T>[],
): (T | undefined)[] {
  const formats = new Map<string, number>();
  const facettes = new Map<string, number>();

  return choix.map((candidates) => {
    const retenue = moinsServi(candidates, formats, facettes);

    if (!retenue) return undefined;

    // Le format se compte en effort, la facette à l'unité : une facette est un
    // angle, pas un effort.
    formats.set(retenue.format, (formats.get(retenue.format) ?? 0) + coutDe(retenue.format));
    facettes.set(retenue.facet, (facettes.get(retenue.facet) ?? 0) + 1);

    return retenue;
  });
}
