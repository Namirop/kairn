import { apercuBrut, decrireIssues } from "./diagnostic";
import { AIFixtureMissingError, AIInvalidOutputError } from "./errors";
import { estUneIntentionDeBanc, type AiContract, type AiPurposeProduit } from "./schemas";
import extractAtomsEn from "./fixtures/extract-atoms.en.json";
import extractAtoms from "./fixtures/extract-atoms.json";
import generateVariantsEn from "./fixtures/generate-variants.en.json";
import generateVariants from "./fixtures/generate-variants.json";
import ocrExtract from "./fixtures/ocr-extract.json";
import { promptsSysteme } from "./prompts";

/**
 * Le mode mock, déterministe : un même dépôt rend toujours le même cas.
 *
 * Un cas se choisit par mot-clé d'abord — un rejet sur une liste de courses, un
 * `uncertain` sur une affirmation fausse, que la longueur ne distingue pas —,
 * puis par longueur. Les fixtures passent par le même schéma Zod que les vraies
 * réponses et échouent de la même façon.
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

/**
 * Une fixture par intention du produit. Le banc n'en a pas : juger des
 * fixtures ne mesurerait rien, et `loadFixture` fait échouer un juge appelé
 * sous `MOCK_AI=true` plutôt que de fabriquer un verdict.
 */
const FIXTURES: Record<AiPurposeProduit, FixtureFile> = {
  extract_atoms: extractAtoms,
  generate_variants: generateVariants,
  ocr_extract: ocrExtract,
};

/**
 * Les mêmes cas en anglais. La lecture d'image n'en a pas : elle transcrit dans
 * la langue de l'image, avec la même consigne dans les deux.
 *
 * La langue se lit sur la consigne reçue plutôt que sur un paramètre de plus :
 * c'est ce qui distingue l'appel, comme pour le modèle.
 */
const FIXTURES_EN: Partial<Record<AiPurposeProduit, FixtureFile>> = {
  extract_atoms: extractAtomsEn,
  generate_variants: generateVariantsEn,
};

function fixturesPour(purpose: AiPurposeProduit, system: string): FixtureFile {
  const anglais = FIXTURES_EN[purpose];

  return anglais && system === promptsSysteme("EN")[purpose] ? anglais : FIXTURES[purpose];
}

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

export function loadFixture<T>(contract: AiContract<T>, input: string, system: string): T {
  if (estUneIntentionDeBanc(contract.purpose)) {
    throw new AIFixtureMissingError(
      `${contract.purpose} — le banc ne tourne pas en mode mock, il exige MOCK_AI=false`,
    );
  }

  const selected = selectCase(fixturesPour(contract.purpose, system), input);

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
