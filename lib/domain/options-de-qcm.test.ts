import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { normaliserLesOptions, OPTIONS_PAR_QCM } from "./options-de-qcm";

const options = fc.array(fc.string({ minLength: 1 }), { minLength: 1, maxLength: 9 });

describe("normaliserLesOptions", () => {
  it("laisse quatre options intactes", () => {
    const quatre = ["a", "b", "c", "d"];

    expect(normaliserLesOptions(quatre, 2)).toEqual({ options: quatre, correctIndex: 2 });
  });

  it("ramène cinq options à quatre en gardant la bonne", () => {
    const normalise = normaliserLesOptions(["a", "b", "c", "d", "bonne"], 4);

    expect(normalise?.options).toHaveLength(OPTIONS_PAR_QCM);
    expect(normalise?.options[normalise.correctIndex]).toBe("bonne");
  });

  it("garde moins de quatre options sans en inventer", () => {
    expect(normaliserLesOptions(["a", "b"], 1)).toEqual({ options: ["a", "b"], correctIndex: 1 });
  });

  it("signale un index qui ne désigne aucune option", () => {
    expect(normaliserLesOptions(["a", "b", "c", "d"], 7)).toBeNull();
    expect(normaliserLesOptions(["a", "b", "c", "d"], -1)).toBeNull();
  });

  it("garde toujours la bonne réponse, quel que soit le nombre d'options", () => {
    fc.assert(
      fc.property(options, fc.integer({ min: 0, max: 8 }), (liste, rang) => {
        const normalise = normaliserLesOptions(liste, rang);

        if (liste[rang] === undefined) {
          expect(normalise).toBeNull();
          return;
        }

        expect(normalise?.options[normalise.correctIndex]).toBe(liste[rang]);
      }),
    );
  });

  it("ne rend jamais plus d'options que demandé, ni des options inventées", () => {
    fc.assert(
      fc.property(options, fc.integer({ min: 0, max: 8 }), (liste, rang) => {
        const normalise = normaliserLesOptions(liste, rang);

        if (normalise === null) return;

        expect(normalise.options.length).toBeLessThanOrEqual(OPTIONS_PAR_QCM);
        expect(normalise.options.length).toBeLessThanOrEqual(liste.length);

        for (const option of normalise.options) expect(liste).toContain(option);
      }),
    );
  });

  it("ne garde pas deux fois la bonne réponse en coupant", () => {
    const normalise = normaliserLesOptions(["bonne", "b", "c", "d", "e"], 0);

    expect(normalise?.options).toEqual(["bonne", "b", "c", "d"]);
    expect(normalise?.correctIndex).toBe(0);
  });
});
