import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { motsNormalises } from "./mots-normalises";

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
