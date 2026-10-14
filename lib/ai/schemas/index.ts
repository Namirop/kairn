/**
 * Les trois contrats de sortie du modèle. Chacun expose une forme, montrée au
 * modèle, et une validation, appliquée à sa réponse. Voir `contrat-de-sortie.ts` pour la
 * raison de cette séparation.
 */

export {
  INTENTIONS_DU_PRODUIT,
  INTENTIONS_DU_BANC,
  estUneIntentionDeBanc,
  type ContratDeSortie,
  type IntentionDAppel,
  type IntentionDuBanc,
  type IntentionDuProduit,
} from "./contrat-de-sortie";
export {
  contratDExtraction,
  CONTRAT_D_EXTRACTION,
  formeDExtraction,
  type SortieDExtraction,
} from "./extract-atoms";
export {
  CONCEPTS_PAR_APPEL,
  contratDeGeneration,
  CONTRAT_DE_GENERATION,
  formeDeGeneration,
  type SortieDeGeneration,
} from "./generate-variants";
export { CONTRAT_DE_LECTURE, formeDeLecture, type SortieDeLecture } from "./ocr-extract";
