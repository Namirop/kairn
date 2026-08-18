import { createHash } from "node:crypto";
import type { AiPurposeProduit } from "../schemas";
import { EXTRACT_ATOMS_PROMPT } from "./extract-atoms";
import { GENERATE_VARIANTS_PROMPT } from "./generate-variants";
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
 */
export const SYSTEM_PROMPTS: Record<AiPurposeProduit, string> = {
  extract_atoms: EXTRACT_ATOMS_PROMPT,
  generate_variants: GENERATE_VARIANTS_PROMPT,
  ocr_extract: OCR_EXTRACT_PROMPT,
};

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

export const PROMPT_VERSIONS: Record<AiPurposeProduit, string> = {
  extract_atoms: empreinte(EXTRACT_ATOMS_PROMPT),
  generate_variants: empreinte(GENERATE_VARIANTS_PROMPT),
  ocr_extract: empreinte(OCR_EXTRACT_PROMPT),
};

export { EXTRACT_ATOMS_PROMPT, GENERATE_VARIANTS_PROMPT, OCR_EXTRACT_PROMPT };
