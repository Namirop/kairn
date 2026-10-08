import { createHash } from "node:crypto";
import type { Langue } from "@/lib/db/types";
import type { AiPurposeProduit } from "../schemas";
import { LANGUES_DES_QUESTIONS, LANGUES_D_EXTRACTION } from "./consignes-de-langue";
import { promptDExtraction } from "./extract-atoms";
import { promptDeQuestions } from "./generate-variants";
import { OCR_EXTRACT_PROMPT } from "./ocr-extract";

/**
 * Prompts système, un par intention **du produit**.
 *
 * Les intentions du banc n'y sont pas : leur prompt voyage avec le juge qui
 * l'émet, dans `scripts/evaluation/`. Un prompt de mesure n'a rien à faire dans
 * la réserve du produit, et l'y mettre obligerait à le maintenir au même titre.
 *
 * Aucun ne contient de consigne « réponds en JSON » : la forme de la sortie est
 * portée par l'outil dérivé du schéma Zod, pas par le texte.
 *
 * La langue est celle du dépôt, jamais celle de la personne au moment de
 * l'appel : une question régénérée parle la langue de ses sœurs. La lecture
 * d'une image n'en prend pas — elle transcrit, elle n'écrit rien.
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
 * L'empreinte d'un prompt, pour savoir plus tard sous quel réglage une question
 * a été écrite.
 *
 * Une empreinte du texte, et pas un numéro qu'on incrémente : elle change
 * exactement quand le prompt change, et jamais parce qu'on a pensé à la bumper.
 * C'est la donnée qu'on oublie de garder, et la seule qui dise si un défaut
 * signalé vient d'un réglage qu'on a déjà corrigé.
 *
 * Douze caractères hexadécimaux : de quoi distinguer sans encombrer un écran.
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
