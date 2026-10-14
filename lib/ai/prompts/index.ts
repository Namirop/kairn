import { createHash } from "node:crypto";
import type { Langue } from "@/lib/db/types";
import type { AiPurposeProduit } from "../schemas";
import { LANGUES_DES_QUESTIONS, LANGUES_D_EXTRACTION } from "./consignes-de-langue";
import { promptDExtraction } from "./extract-atoms";
import { promptDeQuestions } from "./generate-variants";
import { OCR_EXTRACT_PROMPT } from "./ocr-extract";

/**
 * Prompts système, un par intention du produit. Ceux du banc voyagent avec
 * leur juge, dans `scripts/evaluation/`.
 *
 * Aucun ne dit « réponds en JSON » : la forme est portée par le schéma de
 * sortie dérivé de Zod (seul le pont OpenRouter ajoute un préambule, pour les
 * modèles qu'il ne contraint pas).
 *
 * La langue est celle du dépôt, jamais celle de la personne au moment de
 * l'appel : une question régénérée parle la langue de ses sœurs. La lecture
 * d'image n'en prend pas, elle transcrit.
 */
export function promptsSysteme(langue: Langue): Record<AiPurposeProduit, string> {
  return {
    extract_atoms: promptDExtraction(LANGUES_D_EXTRACTION[langue]),
    generate_variants: promptDeQuestions(LANGUES_DES_QUESTIONS[langue]),
    ocr_extract: OCR_EXTRACT_PROMPT,
  };
}

/** Les consignes françaises, pour le banc, qui ne mesure encore qu'elles. */
export const SYSTEM_PROMPTS = promptsSysteme("FR");

/**
 * L'empreinte d'un prompt, pour savoir sous quel réglage une question a été
 * écrite — et donc si un défaut signalé vient d'un réglage déjà corrigé. Une
 * empreinte plutôt qu'un numéro : elle change exactement quand le texte change.
 */
function empreinte(prompt: string): string {
  return createHash("sha256").update(prompt).digest("hex").slice(0, 12);
}

export function versionsDesPrompts(langue: Langue): Record<AiPurposeProduit, string> {
  const prompts = promptsSysteme(langue);

  return {
    extract_atoms: empreinte(prompts.extract_atoms),
    generate_variants: empreinte(prompts.generate_variants),
    ocr_extract: empreinte(prompts.ocr_extract),
  };
}

export const PROMPT_VERSIONS = versionsDesPrompts("FR");

export const EXTRACT_ATOMS_PROMPT = SYSTEM_PROMPTS.extract_atoms;
export const GENERATE_VARIANTS_PROMPT = SYSTEM_PROMPTS.generate_variants;
export { OCR_EXTRACT_PROMPT };
