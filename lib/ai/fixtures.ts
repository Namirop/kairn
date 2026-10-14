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
 * Le mode mock, déterministe : un même dépôt rend toujours le même cas.
 *
 * Un cas se choisit par mot-clé d'abord — un rejet sur une liste de courses, un
 * `uncertain` sur une affirmation fausse, que la longueur ne distingue pas —,
 * puis par longueur. Les fixtures passent par le même schéma Zod que les vraies
 * réponses et échouent de la même façon.
 */

type CasDeFixture = {
  name: string;
  /** Servi dès qu'un de ces mots-clés apparaît dans le dépôt. */
  keywords?: string[];
  /** Servi au-delà de cette longueur, à défaut de mot-clé. */
  minInputChars?: number;
  output: unknown;
};

type FichierDeFixtures = { cases: CasDeFixture[] };

/**
 * Une fixture par intention du produit. Le banc n'en a pas : juger des
 * fixtures ne mesurerait rien, et `chargerLaFixture` fait échouer un juge appelé
 * sous `MOCK_AI=true` plutôt que de fabriquer un verdict.
 */
const FIXTURES: Record<IntentionDuProduit, FichierDeFixtures> = {
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
