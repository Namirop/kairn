import type { ConceptFige, VariantFige } from "../fige";
import { jugerLaFideliteVia } from "../openrouter/juges";
import { JUGE_PRINCIPAL } from "../openrouter/modeles";
import { ajouter, type FactureCumulee } from "./facture-cumulee";
import { motifCourt } from "./motif-court";
import type { VariantServi } from "./questions-servies";

/** L'étape du juge de fidélité d'une colonne de la campagne 2, concept par concept. */

/** Haiku ne supporte pas `reasoning` chez son fournisseur OpenRouter. */
const REASONING_HAIKU = false as const;

export type FideliteDuDepot = {
  fideliteKO: number;
  fideliteAbstenues: number;
  fideliteTotal: number;
};

function enVariantsFige(variants: VariantServi[]): VariantFige[] {
  return variants.map((v) => ({
    facet: v.facet,
    format: v.format,
    question: v.question,
    answerKey: v.answerKey,
    options: v.options,
    correctIndex: v.correctIndex,
    cloze: v.cloze,
  }));
}

export async function jugerLaFideliteDuDepot(
  nomDuDepot: string,
  questionnables: ConceptFige[],
  variantsParConcept: VariantServi[][],
  facture: FactureCumulee,
  loguer: (message: string) => void,
): Promise<FideliteDuDepot> {
  let fideliteKO = 0;
  let fideliteAbstenues = 0;
  let fideliteTotal = 0;
  for (let rangConcept = 0; rangConcept < questionnables.length; rangConcept++) {
    const concept = questionnables[rangConcept]!;
    const variants = variantsParConcept[rangConcept] ?? [];
    if (variants.length === 0) continue;
    try {
      const { verdicts, facture: appel } = await jugerLaFideliteVia(
        JUGE_PRINCIPAL,
        concept.concept,
        enVariantsFige(variants),
        undefined,
        REASONING_HAIKU,
      );
      ajouter(appel, facture);
      for (const v of verdicts) {
        fideliteTotal += 1;
        if (v.juste === null) fideliteAbstenues += 1;
        else if (v.juste === false) fideliteKO += 1;
      }
    } catch (erreur) {
      loguer(
        `  ✗ fidélité ${nomDuDepot} concept ${rangConcept + 1} — ${motifCourt(erreur).slice(0, 200)}`,
      );
    }
  }
  return { fideliteKO, fideliteAbstenues, fideliteTotal };
}
