import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { controlerVariants, FACETTES_ATTENDUES, type VariantAControler } from "./controle-variants";

/**
 * Un lot bien composé : quatre facettes dans l'ordre, trois formats distincts,
 * et une seule question que la personne aura à se noter elle-même.
 */
const FORMATS_PAR_DEFAUT = ["TRUE_FALSE", "EXPLAIN", "CODE", "TRUE_FALSE"];

function variante(reglages: Partial<VariantAControler> = {}, rang = 0): VariantAControler {
  return {
    format: FORMATS_PAR_DEFAUT[rang] ?? "TRUE_FALSE",
    facet: FACETTES_ATTENDUES[rang] ?? "RECOGNITION",
    question: "Depuis quel bout du tableau un index négatif est-il compté ?",
    answerKey: "Depuis la fin. Un index de moins un désigne le dernier élément.",
    options: null,
    correctIndex: null,
    ...reglages,
  };
}

function quatreVariantes(): VariantAControler[] {
  return FACETTES_ATTENDUES.map((facet, rang) => variante({ facet }, rang));
}

describe("controlerVariants", () => {
  it("ne reproche rien à quatre variantes bien formées", () => {
    expect(controlerVariants(quatreVariantes())).toEqual([]);
  });

  it("signale une facette répétée", () => {
    const variantes = quatreVariantes();
    variantes[3] = variante({ facet: "RECOGNITION" }, 3);

    expect(controlerVariants(variantes).map((m) => m.regle)).toContain("facettes");
  });

  it("signale les quatre facettes servies dans le désordre", () => {
    const variantes = [...quatreVariantes()].reverse();
    const regles = controlerVariants(variantes).map((m) => m.regle);

    expect(regles).toContain("ordre");
    expect(regles).not.toContain("facettes");
  });

  it("signale un lot où deux formats seulement se partagent quatre questions", () => {
    const variantes = FACETTES_ATTENDUES.map((facet, rang) =>
      variante({ facet, format: rang < 2 ? "SHORT_ANSWER" : "TRUE_FALSE" }, rang),
    );

    expect(controlerVariants(variantes).map((m) => m.regle)).toContain("formats");
  });

  it("signale un lot qui demande de se noter soi-même plus d'une fois", () => {
    const variantes = FACETTES_ATTENDUES.map((facet, rang) =>
      variante({ facet, format: ["SHORT_ANSWER", "EXPLAIN", "TRUE_FALSE", "CODE"][rang] }, rang),
    );
    const libre = controlerVariants(variantes).find((m) => m.regle === "texte libre");

    // Quatre formats distincts : l'ancien contrôle ne voyait rien de ce lot.
    expect(controlerVariants(variantes).map((m) => m.regle)).not.toContain("formats");
    expect(libre?.detail).toContain("2 questions");
  });

  it("laisse passer une seule question à s'auto-noter", () => {
    const variantes = FACETTES_ATTENDUES.map((facet, rang) =>
      variante({ facet, format: ["MCQ", "EXPLAIN", "TRUE_FALSE", "CODE"][rang] }, rang),
    );
    variantes[0] = variante(
      {
        facet: "RECOGNITION",
        format: "MCQ",
        options: ["un", "deux", "trois", "quatre"],
        correctIndex: 1,
      },
      0,
    );

    expect(controlerVariants(variantes).map((m) => m.regle)).not.toContain("texte libre");
  });

  it("signale un lot qui ne rend pas quatre questions", () => {
    expect(controlerVariants(quatreVariantes().slice(0, 3)).map((m) => m.regle)).toContain(
      "nombre",
    );
  });

  it("situe le manquement sur la variante qu'il vise", () => {
    const variantes = quatreVariantes();
    variantes[2] = variante(
      {
        facet: "BOUNDARY",
        question: "L'index négatif est compté depuis la fin du tableau : vrai ou faux ?",
        answerKey: "L'index négatif est compté depuis la fin du tableau",
      },
      2,
    );
    const cite = controlerVariants(variantes).find((m) => m.regle === "réponse citée");

    expect(cite?.rang).toBe(2);
  });
});

describe("propriétés", () => {
  it("rend toujours autant de manquements de facette que de désordre introduit", () => {
    fc.assert(
      fc.property(fc.shuffledSubarray([0, 1, 2, 3], { minLength: 4, maxLength: 4 }), (ordre) => {
        const variantes = ordre.map((rang, position) =>
          variante({ facet: FACETTES_ATTENDUES[rang] }, position),
        );
        const regles = controlerVariants(variantes).map((m) => m.regle);
        const trie = ordre.every((rang, position) => rang === position);

        return trie ? !regles.includes("ordre") : regles.includes("ordre");
      }),
      { numRuns: 100 },
    );
  });

  it("ne signale le texte libre que passé une question, quel que soit le lot", () => {
    const format = fc.constantFrom("MCQ", "CLOZE", "TRUE_FALSE", "CODE", "SHORT_ANSWER", "EXPLAIN");

    fc.assert(
      fc.property(fc.array(format, { minLength: 4, maxLength: 4 }), (formats) => {
        const variantes = FACETTES_ATTENDUES.map((facet, rang) =>
          variante({ facet, format: formats[rang] }, rang),
        );
        const signale = controlerVariants(variantes).some((m) => m.regle === "texte libre");
        const libres = formats.filter((f) => f === "SHORT_ANSWER" || f === "EXPLAIN").length;

        return signale === libres > 1;
      }),
      { numRuns: 300 },
    );
  });
});
