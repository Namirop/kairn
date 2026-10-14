import type { SortieDeGeneration } from "@/lib/ai/schemas";
import { ordonnerLesOptions } from "@/lib/domain/ordre-des-options";
import { cibleDuVraiOuFaux } from "@/lib/domain/vrai-ou-faux";
import type { VariantFige } from "../fige";

/**
 * Met en forme les variants bruts d'un lot comme le produit le fait en base,
 * sans rien écrire, dans la forme du figé que lisent le juge de fidélité et le
 * radotage.
 *
 * La graine des tirages est le texte du concept, comme dans `execution.ts`,
 * pour qu'un rejeu compare question par question.
 */

type VariantBrut = SortieDeGeneration["lots"][number]["variants"][number];

export type VariantServi = VariantFige & {
  /** La cible du vrai/faux imposée par le serveur, `null` hors TRUE_FALSE. */
  cible: boolean | null;
  /** Ce que le modèle a rendu comme valeur de vérité, `null` hors TRUE_FALSE. */
  estVraie: boolean | null;
};

export function servirVariants(concept: string, bruts: VariantBrut[]): VariantServi[] {
  return bruts.map((variant): VariantServi => {
    const graineCible = concept;
    const cible = variant.format === "TRUE_FALSE" ? cibleDuVraiOuFaux(graineCible) : null;
    const estVraie = variant.format === "TRUE_FALSE" ? (variant.estVraie ?? null) : null;

    if (variant.options === null || variant.correctIndex === null) {
      return {
        facet: variant.facet,
        format: variant.format,
        question: variant.question,
        answerKey: variant.answerKey,
        options: null,
        correctIndex: null,
        cloze: variant.cloze ?? null,
        cible,
        estVraie,
      };
    }

    const graineOptions = `${concept}:${variant.facet}`;
    const servi = ordonnerLesOptions(variant.options, variant.correctIndex, graineOptions);

    return {
      facet: variant.facet,
      format: variant.format,
      question: variant.question,
      answerKey: variant.answerKey,
      options: servi.options,
      correctIndex: servi.correctIndex,
      cloze: variant.cloze ?? null,
      cible,
      estVraie,
    };
  });
}
