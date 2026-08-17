import { gesteDeReponse, type GesteDeReponse } from "./geste-de-reponse";
import type { VarianteServable } from "./rotation-variantes";

/**
 * Ce que sert l'entraînement libre.
 *
 * Il existe parce qu'un compte neuf fait le tour de sa session en quatre
 * questions et tombe sur « reviens demain ». C'est le moment où on perd les
 * gens : deux concepts déposés, huit questions écrites, et une seule servie.
 *
 * Il ne planifie rien. Aucune échéance, aucune stabilité, aucun état ne se
 * calcule ici — pas même en lecture. Ce fichier choisit des questions à poser,
 * dans un ordre, et s'arrête là.
 *
 * Ce qu'il sert en premier : ce qui a le moins servi, tous modes confondus, et
 * ce qui a été vu il y a le plus longtemps. La question que la session vient de
 * poser porte donc une trace fraîche et part en fin de file — c'est comme ça
 * qu'on pioche « dans les autres facettes » sans avoir à les nommer.
 */

/**
 * Questions par tour d'entraînement.
 *
 * Illimité ne veut pas dire sans fin : on sert un tour, on annonce qu'il est
 * fini, et on laisse redemander. Une liste qui ne s'arrête jamais est une
 * liste qu'on quitte par lassitude plutôt qu'au moment choisi.
 */
export const QUESTIONS_PAR_TOUR = 12;

/** Le format s'ajoute à ce que la rotation lit : c'est lui qui donne le geste. */
export type VarianteEntrainable = VarianteServable & { format: string };

export type ConceptEntrainable = {
  id: string;
  variants: VarianteEntrainable[];
};

export type QuestionTiree = { atomId: string; variantId: string };

/** Jamais vue, quel que soit le mode : elle passe devant. */
function vueLe(
  variante: VarianteServable,
  derniersEntrainements: Map<string, Date | null>,
): number {
  const entrainee = derniersEntrainements.get(variante.id) ?? null;
  const instants = [variante.lastSessionAt, entrainee]
    .filter((instant): instant is Date => instant !== null)
    .map((instant) => instant.getTime());

  return instants.length === 0 ? Number.NEGATIVE_INFINITY : Math.max(...instants);
}

function usage(variante: VarianteServable): number {
  return variante.sessionCount + variante.trainingCount;
}

/**
 * L'ordre de service d'un concept : la question la moins usée d'abord.
 *
 * Le tri est total et déterministe — usage, puis ancienneté, puis identifiant.
 * Deux appels sur les mêmes données rendent la même file.
 */
function fileDunConcept(
  concept: ConceptEntrainable,
  derniersEntrainements: Map<string, Date | null>,
): VarianteEntrainable[] {
  return [...concept.variants].sort(
    (une, deux) =>
      usage(une) - usage(deux) ||
      vueLe(une, derniersEntrainements) - vueLe(deux, derniersEntrainements) ||
      une.id.localeCompare(deux.id),
  );
}

/**
 * Un tour d'entraînement : des questions tirées des concepts existants, sans
 * jamais deux fois le même concept d'affilée tant qu'un autre est disponible, et
 * sans deux fois le même geste de réponse tant qu'un autre est disponible.
 *
 * Le geste passe après le concept, dans cet ordre et pas l'inverse : revoir le
 * même concept coûte plus cher que refaire le même geste. Quand les deux sont
 * possibles, on prend les deux.
 *
 * `derniersEntrainements` porte la date du dernier passage d'entraînement par
 * variante. Elle ne vit pas sur le Variant au moment du tirage — elle est lue
 * en base — mais elle est passée en paramètre pour que la fonction reste pure
 * et que le tri se rejoue à l'identique dans un test.
 */
export function composerEntrainement(
  concepts: ConceptEntrainable[],
  derniersEntrainements: Map<string, Date | null> = new Map(),
  taille: number = QUESTIONS_PAR_TOUR,
): QuestionTiree[] {
  const files = new Map<string, { atomId: string; file: VarianteEntrainable[] }>();

  for (const concept of concepts) {
    const file = fileDunConcept(concept, derniersEntrainements);

    if (file.length > 0) files.set(concept.id, { atomId: concept.id, file });
  }

  const tirees: QuestionTiree[] = [];
  let precedent: string | null = null;
  let gestePrecedent: GesteDeReponse | null = null;

  while (tirees.length < Math.max(0, taille)) {
    const restants = [...files.values()].filter((entree) => entree.file.length > 0);

    if (restants.length === 0) break;

    // Répéter un concept vaut mieux que raccourcir le tour : quand il ne reste
    // que lui, il repasse — c'est le cas du compte à un seul concept. Et répéter
    // un geste vaut mieux que répéter un concept, d'où l'ordre des deux filtres.
    const autres = restants.filter((entree) => entree.atomId !== precedent);
    const tirage = autres.length > 0 ? autres : restants;
    const varies = tirage.filter((entree) => rangDuGesteAutre(entree.file, gestePrecedent) >= 0);
    const retenus = varies.length > 0 ? varies : tirage;
    const choisi = retenus.reduce((une, deux) => (deux.file.length > une.file.length ? deux : une));
    // Le geste peut faire passer une question devant une autre du même concept :
    // l'ordre d'usure est une préférence, ne pas refaire le même geste deux fois
    // de suite est une contrainte. Les deux questions seront servies de toute
    // façon, la seule chose qui change est laquelle vient d'abord.
    const rang = Math.max(rangDuGesteAutre(choisi.file, gestePrecedent), 0);
    const [variante] = choisi.file.splice(rang, 1);

    if (!variante) break;

    tirees.push({ atomId: choisi.atomId, variantId: variante.id });
    precedent = choisi.atomId;
    gestePrecedent = gesteDeReponse(variante.format);
  }

  return tirees;
}

/**
 * Où se trouve, dans cette file, la première question d'un autre geste que
 * celui qu'on vient de servir. `-1` si la file n'en porte aucune.
 *
 * Chercher au-delà de la tête est ce qui fait vraiment alterner : les concepts
 * portent souvent les mêmes formats dans le même ordre, si bien qu'à ne regarder
 * que les têtes, tous les candidats proposaient « choisis ta réponse » et le tour
 * enchaînait cinq QCM.
 */
function rangDuGesteAutre(
  file: VarianteEntrainable[],
  gestePrecedent: GesteDeReponse | null,
): number {
  return file.findIndex((variante) => gesteDeReponse(variante.format) !== gestePrecedent);
}
