import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { aplati, sansAccents } from "./texte-aplati";

describe("sansAccents", () => {
  it("ôte les accents et garde la casse et la ponctuation", () => {
    expect(sansAccents("Élève, l'ÉTÉ à Noël !")).toBe("Eleve, l'ETE a Noel !");
  });

  it("ôte un accent déjà décomposé", () => {
    expect(sansAccents("été")).toBe("ete");
  });

  it("laisse intacte une lettre sans décomposition", () => {
    expect(sansAccents("œuf ß ø")).toBe("œuf ß ø");
  });

  it("est idempotente", () => {
    fc.assert(
      fc.property(fc.string({ unit: "grapheme" }), (texte) => {
        const une = sansAccents(texte);

        expect(sansAccents(une)).toBe(une);
      }),
    );
  });

  it("ne laisse aucun diacritique combinant", () => {
    fc.assert(
      fc.property(fc.string({ unit: "grapheme" }), (texte) => {
        expect(sansAccents(texte)).not.toMatch(/[̀-ͯ]/);
      }),
    );
  });
});

describe("aplati", () => {
  it("ôte les accents et la casse, rien d'autre", () => {
    expect(aplati("  Élève, l'ÉTÉ !")).toBe("  eleve, l'ete !");
  });

  it("rend une chaîne vide pour une chaîne vide", () => {
    expect(aplati("")).toBe("");
  });

  it("est idempotente", () => {
    fc.assert(
      fc.property(fc.string({ unit: "grapheme" }), (texte) => {
        const une = aplati(texte);

        expect(aplati(une)).toBe(une);
      }),
    );
  });

  it("confond deux écritures d'un mot qui ne diffèrent que par accents et casse", () => {
    expect(aplati("CAFÉ")).toBe(aplati("cafe"));
  });
});
