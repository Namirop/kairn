import { conceptsAQuestionner } from "@/lib/domain/nature-du-depot";
import type { DepotFige } from "../fige";
import type { Vecteur } from "../mesures/espace";
import type { ScoreDepotQuestions } from "./execution-questions";
import { mesurerLeDepotQuestions } from "./mesures-questions";
import type { VariantServi } from "./questions-servies";

/**
 * La référence Sonnet, sans rejouer : mesures recalculées sur les questions du
 * figé, fidélité lue dans le cache des verdicts du passage `11h58`.
 */
export function scoreReferenceSonnet(
  depot: DepotFige,
  cacheFidelite: Record<string, { juste: boolean | null }[]> | undefined,
  vecteur: (texte: string) => Vecteur | null,
): ScoreDepotQuestions {
  const questionnables = conceptsAQuestionner(depot.concepts, depot.nature);
  const variantsParConcept: VariantServi[][] = questionnables.map((c) => {
    const bruts = c.variants ?? [];
    return bruts.map((v): VariantServi => ({
      facet: v.facet,
      format: v.format,
      question: v.question,
      answerKey: v.answerKey,
      options: v.options,
      correctIndex: v.correctIndex,
      cloze: v.cloze ?? null,
      cible: null,
      estVraie: null,
    }));
  });

  let fideliteKO = 0;
  let fideliteAbstenues = 0;
  let fideliteTotal = 0;
  for (const concept of questionnables) {
    const verdicts = cacheFidelite?.[concept.concept] ?? [];
    for (const v of verdicts) {
      fideliteTotal += 1;
      if (v.juste === null) fideliteAbstenues += 1;
      else if (v.juste === false) fideliteKO += 1;
    }
  }

  const vecteurNonNul = (texte: string) => {
    const v = vecteur(texte);
    if (v === null) throw new Error(`Vecteur manquant pour: ${texte.slice(0, 60)}`);
    return v;
  };
  const mesures =
    variantsParConcept.length === 0 || variantsParConcept.every((v) => v.length === 0)
      ? null
      : mesurerLeDepotQuestions(depot.nom, variantsParConcept, vecteurNonNul);

  return {
    nom: depot.nom,
    conceptsQuestionnables: questionnables.length,
    variantsRendus: variantsParConcept.reduce((s, v) => s + v.length, 0),
    groupesEchoues: 0,
    mesures,
    fideliteKO,
    fideliteAbstenues,
    fideliteTotal,
  };
}
