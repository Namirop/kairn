import { describe, expect, it } from "vitest";
import { toToolInputSchema } from "../tool-schema";
import { GENERATE_VARIANTS, generateVariantsForme } from "./generate-variants";

/**
 * Le premier passage du banc a rendu quatre lots sur vingt-quatre, dont seize
 * où le tableau arrivait en chaîne. On a soupçonné le schéma d'outil d'être
 * dégénéré — il ne l'était pas, mais rien ne le prouvait.
 *
 * Ce test prouve ce que le modèle voit, et tombe si un `.refine()` revient
 * s'intercaler sur le chemin de dérivation ou si le tableau réapparaît.
 */

function chemin(valeur: unknown, ...cles: string[]): unknown {
  return cles.reduce<unknown>(
    (courant, cle) =>
      typeof courant === "object" && courant !== null ? Reflect.get(courant, cle) : undefined,
    valeur,
  );
}

const CLES = ["recognition", "mechanism", "boundary", "application"];

describe("schéma d'outil de generate_variants", () => {
  const outil = toToolInputSchema(generateVariantsForme);

  it("porte quatre clés nommées, et aucun tableau de questions", () => {
    expect(Object.keys(chemin(outil, "properties") ?? {})).toEqual(CLES);
    expect(chemin(outil, "required")).toEqual(CLES);
    expect(JSON.stringify(outil)).not.toContain('"type":"array","items":{"type":"object"');
  });

  it("montre les cinq formats sur chacune des quatre clés", () => {
    for (const cle of CLES) {
      expect(chemin(outil, "properties", cle, "properties", "format", "enum")).toEqual([
        "MCQ",
        "TRUE_FALSE",
        "SHORT_ANSWER",
        "CODE",
        "EXPLAIN",
      ]);
    }
  });

  it("n'exige d'une question que ce que tout format porte", () => {
    // `mcq` est absent de `required` : trois questions sur quatre n'en ont pas,
    // et le modèle omet une clé plutôt que de l'annuler.
    for (const cle of CLES) {
      expect(chemin(outil, "properties", cle, "required")).toEqual([
        "format",
        "question",
        "answerKey",
      ]);
    }
  });

  it("décrit le MCQ à plat, sans renvoi à une définition partagée", () => {
    const options = chemin(outil, "properties", "boundary", "properties", "mcq");

    expect(JSON.stringify(outil)).not.toContain("$ref");
    expect(JSON.stringify(outil)).not.toContain("$defs");
    expect(JSON.stringify(options)).toContain("correctIndex");
  });

  it("dérive la forme, jamais la validation", () => {
    // La validation porte une contrainte croisée et une mise à plat en
    // tableau : rien de tout cela ne s'exprime en JSON Schema.
    expect(toToolInputSchema(GENERATE_VARIANTS.forme)).toEqual(outil);
    expect(GENERATE_VARIANTS.validation).not.toBe(GENERATE_VARIANTS.forme);
  });

  it("rend un tableau ordonné, facettes remplies depuis les clés", () => {
    const question = (format: string) => ({
      format,
      question: "Une question assez longue pour passer.",
      answerKey: "Une réponse.",
    });
    const sortie = GENERATE_VARIANTS.validation.parse({
      recognition: question("SHORT_ANSWER"),
      mechanism: question("EXPLAIN"),
      boundary: question("TRUE_FALSE"),
      application: {
        ...question("MCQ"),
        mcq: { options: ["une", "deux", "trois", "quatre"], correctIndex: 2 },
      },
    });

    expect(sortie.variants.map((variant) => variant.facet)).toEqual([
      "RECOGNITION",
      "MECHANISM",
      "BOUNDARY",
      "APPLICATION",
    ]);
    expect(sortie.variants[0]?.options).toBeNull();
    expect(sortie.variants[3]?.correctIndex).toBe(2);
  });

  it("refuse un mcq posé sur un format libre, et un MCQ sans options", () => {
    const question = (format: string) => ({
      format,
      question: "Une question assez longue pour passer.",
      answerKey: "Une réponse.",
    });
    const base = {
      recognition: question("SHORT_ANSWER"),
      mechanism: question("EXPLAIN"),
      boundary: question("TRUE_FALSE"),
      application: question("MCQ"),
    };

    expect(GENERATE_VARIANTS.validation.safeParse(base).success).toBe(false);
    expect(
      GENERATE_VARIANTS.validation.safeParse({
        ...base,
        recognition: {
          ...question("SHORT_ANSWER"),
          mcq: { options: ["a", "b", "c", "d"], correctIndex: 0 },
        },
        application: {
          ...question("MCQ"),
          mcq: { options: ["a", "b", "c", "d"], correctIndex: 0 },
        },
      }).success,
    ).toBe(false);
  });
});
