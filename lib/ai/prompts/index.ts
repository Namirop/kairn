import type { AiPurpose } from "../schemas";
import { EXTRACT_ATOMS_PROMPT } from "./extract-atoms";
import { GENERATE_VARIANTS_PROMPT } from "./generate-variants";
import { OCR_EXTRACT_PROMPT } from "./ocr-extract";

/**
 * Prompts système, un par intention.
 *
 * Aucun ne contient de consigne « réponds en JSON » : la forme de la sortie est
 * portée par l'outil dérivé du schéma Zod, pas par le texte.
 */
export const SYSTEM_PROMPTS: Record<AiPurpose, string> = {
  extract_atoms: EXTRACT_ATOMS_PROMPT,
  generate_variants: GENERATE_VARIANTS_PROMPT,
  ocr_extract: OCR_EXTRACT_PROMPT,
};

export { EXTRACT_ATOMS_PROMPT, GENERATE_VARIANTS_PROMPT, OCR_EXTRACT_PROMPT };
