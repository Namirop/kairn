/**
 * Varie les formats d'une session parmi les variantes que la rotation juge
 * également bonnes, sans affaiblir aucune règle de mémoire. Sans ça, l'identifiant
 * départagerait, et un même `createMany` donnerait le même format partout. Le
 * format passe avant la facette parce qu'il se voit. Déterministe.
 */

import { gesteDeReponse, type GesteDeReponse } from "./geste-de-reponse";

/**
 * Égaliser à l'unité tirerait l'explication (15 % de l'écrit) vers le quart, or
 * formuler pèse bien plus que choisir. Comptée double, elle retombe vers sa part.
 */
const COUT: Record<GesteDeReponse, number> = { CHOISIR: 1, SAISIR: 1, FORMULER: 2 };

function coutDe(format: string): number {
  return COUT[gesteDeReponse(format)];
}

export type VarianteRepartissable = {
  id: string;
  format: string;
  facet: string;
};

/**
 * Dans l'ordre de la rotation. Un concept sans candidate rend `undefined` à sa
 * place, pour que l'appelant garde l'alignement avec sa propre liste.
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
 * Glouton, assumé : un optimum global ne se verrait pas à l'écran. L'ordre reçu
 * compte donc, à l'appelant de le rendre stable.
 */
export function repartirLesFormats<T extends VarianteRepartissable>(
  choix: ChoixDunConcept<T>[],
): (T | undefined)[] {
  const formats = new Map<string, number>();
  const facettes = new Map<string, number>();

  return choix.map((candidates) => {
    const retenue = moinsServi(candidates, formats, facettes);

    if (!retenue) return undefined;

    // Une facette est un angle, pas un effort : elle se compte à l'unité.
    formats.set(retenue.format, (formats.get(retenue.format) ?? 0) + coutDe(retenue.format));
    facettes.set(retenue.facet, (facettes.get(retenue.facet) ?? 0) + 1);

    return retenue;
  });
}
