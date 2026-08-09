import type { ZodType } from "zod";
import { AIFixtureMissingError, AIInvalidOutputError } from "./errors";
import type { AiPurpose } from "./schemas";
import extractAtoms from "./fixtures/extract-atoms.json";
import generateVariants from "./fixtures/generate-variants.json";
import ocrExtract from "./fixtures/ocr-extract.json";

/**
 * Le mode mock. Chaque intention porte plusieurs cas, choisis par la longueur du
 * texte soumis : une phrase isolée ne rend qu'un concept, un pavé en rend six.
 * La sélection est déterministe, donc deux exécutions donnent le même résultat.
 *
 * Les fixtures passent par le même schéma Zod que les vraies réponses : une
 * fixture mal formée échoue exactement comme une sortie de modèle invalide.
 */

type FixtureFile = {
  cases: { name: string; minInputChars: number; output: unknown }[];
};

const FIXTURES: Record<AiPurpose, FixtureFile> = {
  extract_atoms: extractAtoms,
  generate_variants: generateVariants,
  ocr_extract: ocrExtract,
};

export function loadFixture<T>(purpose: AiPurpose, schema: ZodType<T>, inputChars: number): T {
  const file = FIXTURES[purpose];
  const selected = [...file.cases]
    .sort((a, b) => a.minInputChars - b.minInputChars)
    .filter((entry) => inputChars >= entry.minInputChars)
    .at(-1);

  if (!selected) {
    throw new AIFixtureMissingError(purpose);
  }

  const parsed = schema.safeParse(selected.output);

  if (!parsed.success) {
    throw new AIInvalidOutputError(
      purpose,
      parsed.error.issues.map((issue) => `${issue.path.join(".")} : ${issue.message}`),
    );
  }

  return parsed.data;
}
