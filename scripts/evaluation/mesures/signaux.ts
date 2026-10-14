import type { ConceptFige, DepotFige } from "../fige";
import type { Vecteur } from "./espace";
import { mediane, pairesTriees, plusProche } from "./geometrie";
import { segmenter } from "./segmentation";

/**
 * Les quatre signaux, tirés d'une seule passe de vecteurs.
 *
 * Tout se calcule à l'intérieur d'un dépôt : une distance entre textes de deux
 * dépôts différents ne veut rien dire. Le rapport agrège des comptes, jamais des
 * distances.
 *
 * Aucun seuil ici : ce module rend des listes triées, pas des verdicts. Les
 * seuils vivent dans `seuils.ts`.
 */

export type Rapproche = { texte: string; voisin: string; proximite: number };
export type Paire = { un: string; deux: string; proximite: number };

/** Contexte porté par chaque question dans les paires du radotage. */
export type ContexteDeQuestion = {
  concept: string;
  facet: string;
  format: string;
};
export type PaireDeQuestions = Paire & {
  un: string;
  deux: string;
  contexteUn: ContexteDeQuestion;
  contexteDeux: ContexteDeQuestion;
};

/**
 * L'état de l'extraction pour ce dépôt. Distingue deux silences : un rejet du
 * produit (voulu, avec motif) et un appel qui a planté (panne, sortie invalide).
 */
export type EtatDuDepot =
  | { statut: "extrait" }
  | { statut: "rejete"; motif: string }
  | { statut: "en-echec"; motif: string };

export type MesuresDuDepot = {
  nom: string;
  segments: number;
  concepts: number;
  etat: EtatDuDepot;
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
   * `null` quand le figé ne porte pas de questions : « pas mesuré », que le
   * rapport doit distinguer de « zéro radotage ».
   */
  radotage: { intraLot: PaireDeQuestions[]; interConcepts: PaireDeQuestions[] } | null;
  /** Médianes du dépôt, pour la ligne de tableau. `null` si rien à mesurer. */
  medianes: { couverture: number | null; soutien: number | null };
};

function etatDuDepot(depot: DepotFige): EtatDuDepot {
  if (depot.echec) return { statut: "en-echec", motif: depot.echec.motif };
  if (depot.rejet !== null) return { statut: "rejete", motif: depot.rejet };
  // Sans concept, sans rejet et sans échec : un appel raté dans un figé qui ne
  // persistait pas encore `echec`. On l'annonce comme tel plutôt que de le lire
  // comme extrait.
  if (depot.concepts.length === 0) {
    return {
      statut: "en-echec",
      motif: "extraction en échec silencieux (aucun concept, aucun motif)",
    };
  }
  return { statut: "extrait" };
}

/** Les questions d'un concept, avec le rang du concept dont elles viennent. */
type QuestionSituee = { texte: string; concept: number; contexte: ContexteDeQuestion };

/**
 * Le texte à mesurer pour le radotage. Pour un CLOZE, la phrase à trou : le
 * champ `question` n'y porte qu'une consigne générique, et toutes les paires à
 * 1,000 en venaient.
 *
 * Sans `cloze` (vieux figés), on retombe sur `question` : mesure bruitée, que
 * le rapport signale par les manquements du banc.
 */
function texteARadoter(variant: NonNullable<ConceptFige["variants"]>[number]): string {
  if (variant.format === "CLOZE" && variant.cloze) return variant.cloze.sentence;
  return variant.question;
}

function questionsDuDepot(concepts: ConceptFige[]): QuestionSituee[] {
  return concepts.flatMap((concept, rang) =>
    (concept.variants ?? []).map((variant) => ({
      texte: texteARadoter(variant),
      concept: rang,
      contexte: { concept: concept.concept, facet: variant.facet, format: variant.format },
    })),
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
): { intraLot: PaireDeQuestions[]; interConcepts: PaireDeQuestions[] } {
  const intraLot: PaireDeQuestions[] = [];
  const interConcepts: PaireDeQuestions[] = [];

  for (const paire of pairesTriees(questions.map((question) => vecteur(question.texte)))) {
    const un = questions[paire.un];
    const deux = questions[paire.deux];

    if (!un || !deux) continue;

    const rendue: PaireDeQuestions = {
      un: un.texte,
      deux: deux.texte,
      proximite: paire.proximite,
      contexteUn: un.contexte,
      contexteDeux: deux.contexte,
    };

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

  // Un dépôt rejeté n'a pas de concept : `rapprocher` rend alors une liste vide.
  const couverture = rapprocher(segments, concepts, vecteur);
  const soutien = rapprocher(concepts, segments, vecteur);

  return {
    nom: depot.nom,
    segments: segments.length,
    concepts: concepts.length,
    etat: etatDuDepot(depot),
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
