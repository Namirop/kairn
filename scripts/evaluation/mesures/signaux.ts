import type { ConceptFige, DepotFige } from "../fige";
import type { Vecteur } from "./espace";
import { mediane, pairesTriees, plusProche } from "./geometrie";
import { segmenter } from "./segmentation";

/**
 * Les quatre signaux, tirés d'une seule passe de vecteurs.
 *
 * Tout se calcule **à l'intérieur d'un dépôt** : comparer une phrase de `18` à
 * un concept de `23` n'a aucun sens, et une moyenne tous dépôts confondus
 * mélangerait des textes qui n'ont rien à voir. Le seul niveau où l'on agrège
 * est le rapport, et il agrège des comptes, pas des distances.
 *
 * Aucun seuil n'apparaît ici, et c'est le point de l'étape de calibration : ce
 * module rend des listes **triées**, pas des verdicts. Les planchers viendront
 * après qu'on aura regardé les listes, et ils vivront ailleurs.
 */

export type Rapproche = { texte: string; voisin: string; proximite: number };
export type Paire = { un: string; deux: string; proximite: number };

export type MesuresDuDepot = {
  nom: string;
  segments: number;
  concepts: number;
  /** Chaque phrase et son concept le plus proche, la moins couverte en tête. */
  couverture: Rapproche[];
  /** Chaque concept et sa phrase la plus proche, le moins soutenu en tête. */
  soutien: Rapproche[];
  /** Paires de concepts, la plus proche en tête. */
  doublons: Paire[];
  /**
   * Paires de questions, la plus proche en tête, séparées selon qu'elles
   * viennent d'un même concept ou de deux concepts différents.
   *
   * `null` quand le figé ne porte pas de questions — les figés antérieurs au
   * gel des questions. Ce n'est pas « zéro radotage », c'est « pas mesuré », et
   * le rapport doit pouvoir dire lequel des deux.
   */
  radotage: { intraLot: Paire[]; interConcepts: Paire[] } | null;
  /** Médianes du dépôt, pour la ligne de tableau. `null` si rien à mesurer. */
  medianes: { couverture: number | null; soutien: number | null };
};

/** Les questions d'un concept, avec le rang du concept dont elles viennent. */
type QuestionSituee = { texte: string; concept: number };

function questionsDuDepot(concepts: ConceptFige[]): QuestionSituee[] {
  return concepts.flatMap((concept, rang) =>
    (concept.variants ?? []).map((variant) => ({ texte: variant.question, concept: rang })),
  );
}

/** Un dépôt porte-t-il des questions figées ? Aucune, et le radotage n'est pas mesuré. */
function aDesQuestions(concepts: ConceptFige[]): boolean {
  return concepts.some((concept) => concept.variants !== undefined);
}

function rapprocher(
  textes: string[],
  cibles: string[],
  vecteur: (texte: string) => Vecteur,
): Rapproche[] {
  const vecteursCibles = cibles.map(vecteur);

  return textes
    .map((texte) => {
      const trouve = plusProche(vecteur(texte), vecteursCibles);

      return {
        texte,
        voisin: trouve === null ? "" : (cibles[trouve.rang] ?? ""),
        proximite: trouve === null ? Number.NaN : trouve.proximite,
      };
    })
    .filter((entree) => !Number.isNaN(entree.proximite))
    .sort((un, deux) => un.proximite - deux.proximite);
}

function apparier(textes: string[], vecteur: (texte: string) => Vecteur): Paire[] {
  return pairesTriees(textes.map(vecteur)).map((paire) => ({
    un: textes[paire.un] ?? "",
    deux: textes[paire.deux] ?? "",
    proximite: paire.proximite,
  }));
}

function apparierLesQuestions(
  questions: QuestionSituee[],
  vecteur: (texte: string) => Vecteur,
): { intraLot: Paire[]; interConcepts: Paire[] } {
  const intraLot: Paire[] = [];
  const interConcepts: Paire[] = [];

  for (const paire of pairesTriees(questions.map((question) => vecteur(question.texte)))) {
    const un = questions[paire.un];
    const deux = questions[paire.deux];

    if (!un || !deux) continue;

    const rendue = { un: un.texte, deux: deux.texte, proximite: paire.proximite };

    if (un.concept === deux.concept) intraLot.push(rendue);
    else interConcepts.push(rendue);
  }

  return { intraLot, interConcepts };
}

/** Tous les textes d'un dépôt qu'il faudra avoir plongés : phrases, concepts, questions. */
export function textesDuDepot(depot: DepotFige): string[] {
  return [
    ...segmenter(depot.texte),
    ...depot.concepts.map((concept) => concept.concept),
    ...questionsDuDepot(depot.concepts).map((question) => question.texte),
  ];
}

export function mesurerLeDepot(
  depot: DepotFige,
  vecteur: (texte: string) => Vecteur,
): MesuresDuDepot {
  const segments = segmenter(depot.texte);
  const concepts = depot.concepts.map((concept) => concept.concept);
  const questions = questionsDuDepot(depot.concepts);

  // Un dépôt rejeté n'a pas de concept : couverture et soutien n'existent pas
  // pour lui, et `rapprocher` rend une liste vide sans qu'on ait à le dire.
  const couverture = rapprocher(segments, concepts, vecteur);
  const soutien = rapprocher(concepts, segments, vecteur);

  return {
    nom: depot.nom,
    segments: segments.length,
    concepts: concepts.length,
    couverture,
    soutien,
    doublons: apparier(concepts, vecteur),
    radotage: aDesQuestions(depot.concepts) ? apparierLesQuestions(questions, vecteur) : null,
    medianes: {
      couverture: mediane(couverture.map((entree) => entree.proximite)),
      soutien: mediane(soutien.map((entree) => entree.proximite)),
    },
  };
}
