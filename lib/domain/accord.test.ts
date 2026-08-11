import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { accord, compte } from "./accord";

describe("accord", () => {
  it("laisse zéro au singulier, comme le veut le français", () => {
    expect(accord(0, "concept", "concepts")).toBe("concept");
  });

  it("garde le singulier à un, le pluriel à partir de deux", () => {
    expect(accord(1, "concept", "concepts")).toBe("concept");
    expect(accord(2, "concept", "concepts")).toBe("concepts");
    expect(accord(12, "jour", "jours")).toBe("jours");
  });

  it("traite un nombre négatif comme sa valeur absolue", () => {
    expect(accord(-1, "jour", "jours")).toBe("jour");
    expect(accord(-3, "jour", "jours")).toBe("jours");
  });

  it("ne bascule qu'une fois, et dans le bon sens", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 500 }), (nombre) => {
        const attendu = nombre < 2 ? "pierre" : "pierres";

        expect(accord(nombre, "pierre", "pierres")).toBe(attendu);
      }),
      { numRuns: 100 },
    );
  });
});

describe("compte", () => {
  it("colle le nombre à son mot accordé", () => {
    expect(compte(0, "concept", "concepts")).toBe("0 concept");
    expect(compte(1, "concept", "concepts")).toBe("1 concept");
    expect(compte(4, "concept", "concepts")).toBe("4 concepts");
  });
});
