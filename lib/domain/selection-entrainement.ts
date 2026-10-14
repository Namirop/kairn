import { gesteDeReponse, type GesteDeReponse } from "./geste-de-reponse";
import type { VarianteServable } from "./rotation-variantes";

/**
 * Ce que sert l'entraînement libre. Il ne planifie rien : aucune échéance,
 * stabilité ni état ne se calcule ici, même en lecture.
 *
 * Il sert d'abord ce qui a le moins servi, tous modes confondus, puis ce qui a
 * été vu il y a le plus longtemps : la question que la session vient de poser
 * part en fin de file, et l'on pioche ainsi dans les autres facettes.
 */

/**
 * Questions par tour d'entraînement. Illimité ne veut pas dire sans fin : un
 * tour s'achève et se redemande, pour qu'on parte au moment choisi plutôt que
 * par lassitude.
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
 * L'ordre de service d'un concept : usage, puis ancienneté, puis identifiant,
 * pour un tri total et déterministe.
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
 * Le concept prime sur le geste : revoir le même concept coûte plus cher que
 * refaire le même geste.
 *
 * `derniersEntrainements` : date du dernier entraînement par variante, lue en
 * base par l'appelant.
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

    // Répéter un concept vaut mieux que raccourcir le tour (compte à un seul
    // concept), et répéter un geste mieux que répéter un concept.
    const autres = restants.filter((entree) => entree.atomId !== precedent);
    const tirage = autres.length > 0 ? autres : restants;
    const varies = tirage.filter((entree) => rangDuGesteAutre(entree.file, gestePrecedent) >= 0);
    const retenus = varies.length > 0 ? varies : tirage;
    const choisi = retenus.reduce((une, deux) => (deux.file.length > une.file.length ? deux : une));
    // L'ordre d'usure est une préférence, l'alternance des gestes une
    // contrainte : le geste peut faire passer une question devant.
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
 * Chercher au-delà de la tête est nécessaire : les concepts portent souvent
 * les mêmes formats dans le même ordre, et les têtes seules enchaîneraient
 * les QCM.
 */
function rangDuGesteAutre(
  file: VarianteEntrainable[],
  gestePrecedent: GesteDeReponse | null,
): number {
  return file.findIndex((variante) => gesteDeReponse(variante.format) !== gestePrecedent);
}
