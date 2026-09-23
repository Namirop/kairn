/**
 * Les trois contrats de sortie du modèle. Chacun expose une forme, montrée au
 * modèle, et une validation, appliquée à sa réponse. Voir `contract.ts` pour la
 * raison de cette séparation.
 */

export {
  AI_PURPOSES,
  AI_PURPOSES_BANC,
  estUneIntentionDeBanc,
  type AiContract,
  type AiPurpose,
  type AiPurposeBanc,
  type AiPurposeProduit,
} from "./contract";
export {
  contratDExtraction,
  EXTRACT_ATOMS,
  extractAtomsForme,
  type ExtractAtomsOutput,
} from "./extract-atoms";
export {
  CONCEPTS_PAR_APPEL,
  contratDeGeneration,
  GENERATE_VARIANTS,
  generateVariantsForme,
  type GenerateVariantsOutput,
} from "./generate-variants";
export { OCR_EXTRACT, ocrExtractForme, type OcrExtractOutput } from "./ocr-extract";
