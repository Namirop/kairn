import { apercuBrut, decrireIssues } from "./diagnostic";
import { FixtureAbsenteError, SortieInvalideError } from "./errors";
import { estUneIntentionDeBanc, type ContratDeSortie, type IntentionDuProduit } from "./schemas";
import extractAtomsEn from "./fixtures/extract-atoms.en.json";
import extractAtoms from "./fixtures/extract-atoms.json";
import generateVariantsEn from "./fixtures/generate-variants.en.json";
import generateVariants from "./fixtures/generate-variants.json";
import ocrExtract from "./fixtures/ocr-extract.json";
import { promptsSysteme } from "./prompts";

/**
 * Le mode mock, déterministe. Un cas se choisit par mot-clé d'abord (un rejet,
 * un `uncertain`, que la longueur ne distingue pas), puis par longueur. Les
 * fixtures passent par le même schéma Zod que les vraies réponses.
 */

type CasDeFixture = {
  name: string;
  keywords?: string[];
  minInputChars?: number;
  output: unknown;
};

type FichierDeFixtures = { cases: CasDeFixture[] };

/** Le banc n'en a pas : juger des fixtures ne mesurerait rien, un juge en mock échoue. */
const FIXTURES: Record<IntentionDuProduit, FichierDeFixtures> = {
  extract_atoms: extractAtoms,
  generate_variants: generateVariants,
  ocr_extract: ocrExtract,
};

/**
 * La lecture d'image n'en a pas : elle transcrit dans la langue de l'image, même
 * consigne dans les deux. La langue se lit sur la consigne reçue, pas sur un paramètre.
 */
const FIXTURES_EN: Partial<Record<IntentionDuProduit, FichierDeFixtures>> = {
  extract_atoms: extractAtomsEn,
  generate_variants: generateVariantsEn,
};

function fixturesPour(purpose: IntentionDuProduit, system: string): FichierDeFixtures {
  const anglais = FIXTURES_EN[purpose];

  return anglais && system === promptsSysteme("EN")[purpose] ? anglais : FIXTURES[purpose];
}

function choisirLeCas(fichier: FichierDeFixtures, entree: string): CasDeFixture | undefined {
  const enMinuscules = entree.toLowerCase();
  const parMotCle = fichier.cases.find((cas) =>
    cas.keywords?.some((motCle) => enMinuscules.includes(motCle.toLowerCase())),
  );

  if (parMotCle) return parMotCle;

  return fichier.cases
    .filter((cas) => cas.minInputChars !== undefined)
    .sort((a, b) => (a.minInputChars ?? 0) - (b.minInputChars ?? 0))
    .filter((cas) => entree.length >= (cas.minInputChars ?? 0))
    .at(-1);
}

export function chargerLaFixture<T>(
  contrat: ContratDeSortie<T>,
  entree: string,
  system: string,
): T {
  if (estUneIntentionDeBanc(contrat.purpose)) {
    throw new FixtureAbsenteError(
      `${contrat.purpose} — le banc ne tourne pas en mode mock, il exige MOCK_AI=false`,
    );
  }

  const retenu = choisirLeCas(fixturesPour(contrat.purpose, system), entree);

  if (!retenu) {
    throw new FixtureAbsenteError(contrat.purpose);
  }

  const lu = contrat.validation.safeParse(retenu.output);

  if (!lu.success) {
    throw new SortieInvalideError(
      contrat.purpose,
      decrireIssues(lu.error, retenu.output),
      apercuBrut(retenu.output),
    );
  }

  return lu.data;
}
