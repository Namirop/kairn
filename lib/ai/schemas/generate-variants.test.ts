import { describe, expect, it } from "vitest";
import { toToolInputSchema } from "../tool-schema";
import { GENERATE_VARIANTS, generateVariantsForme } from "./generate-variants";

/**
 * Le premier passage du banc a rendu quatre lots sur vingt-quatre. On a
 * soupçonné le schéma d'outil d'être dégénéré — il ne l'était pas, mais rien ne
 * le prouvait. Ce test le prouve, et tombe si un `.refine()` revient s'intercaler
 * sur le chemin de dérivation.
 */

function chemin(valeur: unknown, ...cles: string[]): unknown {
  return cles.reduce<unknown>(
    (courant, cle) =>
      typeof courant === "object" && courant !== null ? Reflect.get(courant, cle) : undefined,
    valeur,
  );
}

describe("schéma d'outil de generate_variants", () => {
  const outil = toToolInputSchema(generateVariantsForme);
  const variants = chemin(outil, "properties", "variants");
  const proprietes = chemin(variants, "items", "properties");

  it("décrit variants comme un tableau de quatre entrées", () => {
    expect(chemin(variants, "type")).toBe("array");
    expect(chemin(variants, "minItems")).toBe(4);
    expect(chemin(variants, "maxItems")).toBe(4);
  });

  it("montre les cinq formats et les quatre facettes", () => {
    expect(chemin(proprietes, "format", "enum")).toEqual([
      "MCQ",
      "TRUE_FALSE",
      "SHORT_ANSWER",
      "CODE",
      "EXPLAIN",
    ]);
    expect(chemin(proprietes, "facet", "enum")).toEqual([
      "RECOGNITION",
      "MECHANISM",
      "BOUNDARY",
      "APPLICATION",
    ]);
  });

  it("décrit chaque champ d'une variante", () => {
    expect(Object.keys(chemin(proprietes) ?? {})).toEqual([
      "format",
      "facet",
      "question",
      "answerKey",
      "options",
      "correctIndex",
    ]);
  });

  it("n'exige que ce que le modèle doit toujours rendre", () => {
    // options et correctIndex sont absents de `required` : le modèle les omet
    // pour les formats non-MCQ, c'est son comportement normal.
    expect(chemin(variants, "items", "required")).toEqual([
      "format",
      "facet",
      "question",
      "answerKey",
    ]);
  });

  it("dérive la forme, jamais la validation", () => {
    // La validation porte des contraintes croisées, inexprimables en JSON
    // Schema. La dériver risquerait d'appauvrir ce que le modèle voit.
    expect(toToolInputSchema(generateVariantsForme)).toEqual(
      toToolInputSchema(GENERATE_VARIANTS.forme),
    );
    expect(GENERATE_VARIANTS.validation).not.toBe(GENERATE_VARIANTS.forme);
  });
});
