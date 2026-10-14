import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { motsAplatis, motsNormalises } from "./mots-normalises";

describe("motsNormalises", () => {
  it("retire accents, casse et ponctuation, et borde d'espaces", () => {
    expect(motsNormalises("  Élève, l'ÉTÉ !")).toBe(" eleve l ete ");
  });

  it("rend une simple paire d'espaces pour un texte sans mot", () => {
    expect(motsNormalises("... ?!")).toBe("  ");
  });

  it("est idempotente", () => {
    fc.assert(
      fc.property(fc.string(), (texte) => {
        const une = motsNormalises(texte);

        expect(motsNormalises(une)).toBe(une);
      }),
    );
  });
});

describe("motsAplatis", () => {
  it("retire accents, casse et ponctuation, sans border d'espaces", () => {
    expect(motsAplatis("  Porte-greffe, l'ÉTÉ !")).toBe("porte greffe l ete");
  });

  it("rend une chaîne vide pour un texte sans mot", () => {
    expect(motsAplatis("... ?!")).toBe("");
  });

  it("est idempotente et ne garde que des mots séparés d'une espace", () => {
    fc.assert(
      fc.property(fc.string(), (texte) => {
        const une = motsAplatis(texte);

        expect(motsAplatis(une)).toBe(une);
        expect(une).toMatch(/^([a-z0-9]+( [a-z0-9]+)*)?$/);
      }),
    );
  });

  it("est ce que motsNormalises borde", () => {
    fc.assert(
      fc.property(fc.string(), (texte) => {
        expect(motsNormalises(texte)).toBe(` ${motsAplatis(texte)} `);
      }),
    );
  });
});
