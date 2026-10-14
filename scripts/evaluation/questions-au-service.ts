import type { SortieDeGeneration } from "@/lib/ai/schemas";
import { ordonnerLesOptions, type OptionsServies } from "@/lib/domain/ordre-des-options";
import { cibleDuVraiOuFaux } from "@/lib/domain/vrai-ou-faux";

type VariantBrut = SortieDeGeneration["lots"][number]["variants"][number];

export type MiseEnService = {
  /** La cible du vrai ou faux imposée par l'envoi, `null` hors TRUE_FALSE. */
  cible: boolean | null;
  /** Les options dans l'ordre où elles seront montrées, `null` sans QCM servable. */
  servi: OptionsServies | null;
};

/**
 * Ce que le banc montre d'une question rendue, comme le produit le servirait.
 * Les graines sont le texte du concept, pas un identifiant : le banc n'écrit
 * rien en base, et un concept figé garde son texte, donc deux rejeux se
 * comparent question par question.
 *
 * La cible se sème sur le concept seul, sans la facette : l'envoi n'en annonce
 * qu'une, et n'importe laquelle des quatre questions peut la porter.
 */
export function mettreEnService(concept: string, variant: VariantBrut): MiseEnService {
  const cible = variant.format === "TRUE_FALSE" ? cibleDuVraiOuFaux(concept) : null;

  if (variant.options === null || variant.correctIndex === null) return { cible, servi: null };

  const graine = `${concept}:${variant.facet}`;
  return { cible, servi: ordonnerLesOptions(variant.options, variant.correctIndex, graine) };
}
