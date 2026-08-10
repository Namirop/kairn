import { describe, expect, it } from "vitest";
import { toOutputSchema } from "../output-schema";
import { CONCEPTS_PAR_APPEL, GENERATE_VARIANTS, generateVariantsForme } from "./generate-variants";

/**
 * Le premier passage du banc a rendu quatre lots sur vingt-quatre, dont seize
 * où le tableau arrivait en chaîne. On a soupçonné la forme envoyée d'être
 * dégénérée — elle ne l'était pas, mais rien ne le prouvait.
 *
 * Ce test prouve ce que le modèle voit — la forme d'où la grammaire des
 * structured outputs est compilée. Le tableau est revenu, pour grouper trois
 * concepts par appel ; ce test dit à quelles conditions.
 */

function chemin(valeur: unknown, ...cles: string[]): unknown {
  return cles.reduce<unknown>(
    (courant, cle) =>
      typeof courant === "object" && courant !== null ? Reflect.get(courant, cle) : undefined,
    valeur,
  );
}

const CLES = ["rang", "recognition", "mechanism", "boundary", "application"];
const FACETTES = CLES.slice(1);

function question(format: string) {
  return { format, question: "Une question assez longue pour passer.", answerKey: "Une réponse." };
}

function lot(rang: number, formats = ["SHORT_ANSWER", "EXPLAIN", "TRUE_FALSE", "MCQ"]) {
  const [reconnaissance, mecanisme, limite, application] = formats;

  return {
    rang,
    recognition: question(reconnaissance ?? "SHORT_ANSWER"),
    mechanism: question(mecanisme ?? "EXPLAIN"),
    boundary: question(limite ?? "TRUE_FALSE"),
    application: {
      ...question(application ?? "MCQ"),
      mcq: { options: ["une", "deux", "trois", "quatre"], correctIndex: 2 },
    },
  };
}

describe("forme de sortie de generate_variants", () => {
  const outil = toOutputSchema(generateVariantsForme).schema;
  const entree = chemin(outil, "properties", "lots", "items");

  it("groupe les concepts dans un tableau, un lot par rang", () => {
    expect(chemin(outil, "properties", "lots", "type")).toBe("array");
    expect(chemin(outil, "properties", "lots", "minItems")).toBe(1);
    expect(Object.keys(chemin(entree, "properties") ?? {})).toEqual(CLES);
    expect(chemin(entree, "required")).toEqual(CLES);
  });

  it("contraint les cinq formats sur chacune des quatre facettes", () => {
    for (const cle of FACETTES) {
      expect(chemin(entree, "properties", cle, "properties", "format", "enum")).toEqual([
        "MCQ",
        "TRUE_FALSE",
        "SHORT_ANSWER",
        "CODE",
        "EXPLAIN",
      ]);
    }

    // L'énumération doit rester une contrainte. Le helper du SDK la verse dans
    // la description, où elle n'est plus qu'un conseil — c'est ce qu'on évite.
    expect(JSON.stringify(outil)).not.toContain("{enum:");
  });

  it("n'exige d'une question que ce que tout format porte", () => {
    // `mcq` est absent de `required` : trois questions sur quatre n'en ont pas,
    // et le modèle omet une clé plutôt que de l'annuler.
    for (const cle of FACETTES) {
      expect(chemin(entree, "properties", cle, "required")).toEqual([
        "format",
        "question",
        "answerKey",
      ]);
    }
  });

  it("décrit le MCQ à plat, sans renvoi à une définition partagée", () => {
    expect(JSON.stringify(outil)).not.toContain("$ref");
    expect(JSON.stringify(outil)).not.toContain("$defs");
    expect(JSON.stringify(chemin(entree, "properties", "boundary", "properties", "mcq"))).toContain(
      "correctIndex",
    );
  });

  it("dérive la forme, jamais la validation", () => {
    // La validation porte des contraintes croisées et une mise à plat : rien de
    // tout cela ne s'exprime en JSON Schema.
    expect(toOutputSchema(GENERATE_VARIANTS.forme).schema).toEqual(outil);
    expect(GENERATE_VARIANTS.validation).not.toBe(GENERATE_VARIANTS.forme);
  });

  it("rend un lot par rang, facettes remplies depuis les clés", () => {
    const sortie = GENERATE_VARIANTS.validation.parse({
      lots: [lot(1), lot(2), lot(CONCEPTS_PAR_APPEL)],
    });

    expect(sortie.lots.map((entree) => entree.rang)).toEqual([1, 2, 3]);
    expect(sortie.lots[0]?.variants.map((variant) => variant.facet)).toEqual([
      "RECOGNITION",
      "MECHANISM",
      "BOUNDARY",
      "APPLICATION",
    ]);
    expect(sortie.lots[0]?.variants[0]?.options).toBeNull();
    expect(sortie.lots[2]?.variants[3]?.correctIndex).toBe(2);
  });

  it("refuse deux lots sur le même rang", () => {
    expect(GENERATE_VARIANTS.validation.safeParse({ lots: [lot(1), lot(1)] }).success).toBe(false);
  });

  it("refuse un mcq posé sur un format libre, et un MCQ sans options", () => {
    const sansOptions = { ...lot(1), application: question("MCQ") };
    const optionsEnTrop = {
      ...lot(1),
      recognition: {
        ...question("SHORT_ANSWER"),
        mcq: { options: ["a", "b", "c", "d"], correctIndex: 0 },
      },
    };

    expect(GENERATE_VARIANTS.validation.safeParse({ lots: [sansOptions] }).success).toBe(false);
    expect(GENERATE_VARIANTS.validation.safeParse({ lots: [optionsEnTrop] }).success).toBe(false);
  });
});
