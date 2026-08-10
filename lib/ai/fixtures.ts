import { apercuBrut, decrireIssues } from "./diagnostic";
import { AIFixtureMissingError, AIInvalidOutputError } from "./errors";
import type { AiContract, AiPurpose } from "./schemas";
import extractAtoms from "./fixtures/extract-atoms.json";
import generateVariants from "./fixtures/generate-variants.json";
import ocrExtract from "./fixtures/ocr-extract.json";

/**
 * Le mode mock. Chaque intention porte plusieurs cas, et la sélection est
 * déterministe : deux exécutions sur le même dépôt donnent le même résultat.
 *
 * Un cas se choisit de deux façons. Par mot-clé d'abord : c'est ce qui permet
 * de servir un rejet sur une liste de courses ou un `uncertain` sur une
 * affirmation fausse, que la longueur du texte ne distingue pas. Par longueur
 * ensuite : une phrase isolée ne rend qu'un concept, un article en rend huit.
 *
 * Les fixtures passent par le même schéma Zod que les vraies réponses : une
 * fixture mal formée échoue exactement comme une sortie de modèle invalide.
 */

type FixtureCase = {
  name: string;
  /** Servi dès qu'un de ces mots-clés apparaît dans le dépôt. */
  keywords?: string[];
  /** Servi au-delà de cette longueur, à défaut de mot-clé. */
  minInputChars?: number;
  output: unknown;
};

type FixtureFile = { cases: FixtureCase[] };

const FIXTURES: Record<AiPurpose, FixtureFile> = {
  extract_atoms: extractAtoms,
  generate_variants: generateVariants,
  ocr_extract: ocrExtract,
};

function selectCase(file: FixtureFile, input: string): FixtureCase | undefined {
  const lowered = input.toLowerCase();
  const byKeyword = file.cases.find((entry) =>
    entry.keywords?.some((keyword) => lowered.includes(keyword.toLowerCase())),
  );

  if (byKeyword) return byKeyword;

  return file.cases
    .filter((entry) => entry.minInputChars !== undefined)
    .sort((a, b) => (a.minInputChars ?? 0) - (b.minInputChars ?? 0))
    .filter((entry) => input.length >= (entry.minInputChars ?? 0))
    .at(-1);
}

export function loadFixture<T>(contract: AiContract<T>, input: string): T {
  const selected = selectCase(FIXTURES[contract.purpose], input);

  if (!selected) {
    throw new AIFixtureMissingError(contract.purpose);
  }

  const parsed = contract.validation.safeParse(selected.output);

  if (!parsed.success) {
    throw new AIInvalidOutputError(
      contract.purpose,
      decrireIssues(parsed.error, selected.output),
      apercuBrut(selected.output),
    );
  }

  return parsed.data;
}
