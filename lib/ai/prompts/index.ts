import { createHash } from "node:crypto";
import type { Langue } from "@/lib/db/types";
import type { IntentionDuProduit } from "../schemas";
import { LANGUES_DES_QUESTIONS, LANGUES_D_EXTRACTION } from "./consignes-de-langue";
import { promptDExtraction } from "./extract-atoms";
import { promptDeQuestions } from "./generate-variants";
import { PROMPT_DE_LECTURE } from "./ocr-extract";

/**
 * Un prompt par intention du produit ; ceux du banc voyagent avec leur juge.
 * Aucun ne dit « réponds en JSON » : le schéma de sortie porte la forme (seul le
 * pont OpenRouter ajoute un préambule pour les modèles qu'il ne contraint pas).
 *
 * La langue est celle du dépôt, pas celle de la personne à l'appel : une question
 * régénérée parle la langue de ses sœurs.
 */
export function promptsSysteme(langue: Langue): Record<IntentionDuProduit, string> {
  return {
    extract_atoms: promptDExtraction(LANGUES_D_EXTRACTION[langue]),
    generate_variants: promptDeQuestions(LANGUES_DES_QUESTIONS[langue]),
    ocr_extract: PROMPT_DE_LECTURE,
  };
}

/** Pour le banc, qui ne mesure encore que le français. */
export const PROMPTS_SYSTEME_FR = promptsSysteme("FR");

/**
 * Dit sous quel réglage une question a été écrite, donc si un défaut signalé est
 * déjà corrigé. Une empreinte plutôt qu'un numéro : elle change exactement avec le texte.
 */
function empreinte(prompt: string): string {
  return createHash("sha256").update(prompt).digest("hex").slice(0, 12);
}

export function versionsDesPrompts(langue: Langue): Record<IntentionDuProduit, string> {
  const prompts = promptsSysteme(langue);

  return {
    extract_atoms: empreinte(prompts.extract_atoms),
    generate_variants: empreinte(prompts.generate_variants),
    ocr_extract: empreinte(prompts.ocr_extract),
  };
}

export const VERSIONS_DES_PROMPTS_FR = versionsDesPrompts("FR");

export const PROMPT_D_EXTRACTION = PROMPTS_SYSTEME_FR.extract_atoms;
export const PROMPT_DE_QUESTIONS = PROMPTS_SYSTEME_FR.generate_variants;
export { PROMPT_DE_LECTURE };
