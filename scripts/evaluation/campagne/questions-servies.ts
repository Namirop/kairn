import type { SortieDeGeneration } from "@/lib/ai/schemas";
import type { VariantFige } from "../fige";
import { mettreEnService } from "../questions-au-service";

/**
 * Met en forme les variants bruts d'un lot comme le produit le fait en base,
 * sans rien écrire, dans la forme du figé que lisent le juge de fidélité et le
 * radotage.
 *
 * La mise en service (ordre des options, cible du vrai ou faux) est celle de
 * `questions-du-depot.ts`, pour qu'un rejeu compare question par question.
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
    const { cible, servi } = mettreEnService(concept, variant);
    const estVraie = variant.format === "TRUE_FALSE" ? (variant.estVraie ?? null) : null;

    return {
      facet: variant.facet,
      format: variant.format,
      question: variant.question,
      answerKey: variant.answerKey,
      options: servi?.options ?? null,
      correctIndex: servi?.correctIndex ?? null,
      cloze: variant.cloze ?? null,
      cible,
      estVraie,
    };
  });
}
