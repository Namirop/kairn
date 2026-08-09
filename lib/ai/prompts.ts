import type { AiPurpose } from "./schemas";

/**
 * Prompts système, un par intention.
 *
 * Ils sont volontairement vides en phase 0 : Romain les fournit en phase 1.
 * Ils ne contiennent jamais de consigne « réponds en JSON » — la forme de la
 * sortie est portée par l'outil, pas par le texte.
 */
export const SYSTEM_PROMPTS: Record<AiPurpose, string> = {
  extract_atoms: "",
  generate_variants: "",
  ocr_extract: "",
};
