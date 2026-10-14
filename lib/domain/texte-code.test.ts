import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { segmentsDeCode } from "./texte-code";

describe("segmentsDeCode", () => {
  it("rend un seul morceau quand il n'y a rien à relever", () => {
    expect(segmentsDeCode("Une phrase ordinaire.")).toEqual([
      { code: false, texte: "Une phrase ordinaire." },
    ]);
  });

  it("relève un terme au milieu d'une phrase", () => {
    expect(segmentsDeCode("Jusqu'où porte un `\"use client\"` en haut d'un fichier ?")).toEqual([
      { code: false, texte: "Jusqu'où porte un " },
      { code: true, texte: '"use client"' },
      { code: false, texte: " en haut d'un fichier ?" },
    ]);
  });

  it("relève plusieurs termes dans la même phrase", () => {
    const segments = segmentsDeCode("L'index `(userId, due)` sert `WHERE due < now()`.");

    expect(segments.filter((segment) => segment.code).map((segment) => segment.texte)).toEqual([
      "(userId, due)",
      "WHERE due < now()",
    ]);
  });

  it("relève un terme qui commence ou finit la phrase", () => {
    expect(segmentsDeCode("`useState` garde son état.")[0]).toEqual({
      code: true,
      texte: "useState",
    });
    expect(segmentsDeCode("On écrit `children`")[1]).toEqual({ code: true, texte: "children" });
  });

  it("laisse littéral un accent grave qui n'est jamais refermé", () => {
    expect(segmentsDeCode("Un ` tout seul")).toEqual([{ code: false, texte: "Un ` tout seul" }]);
  });

  it("laisse littérale une paire vide", () => {
    expect(segmentsDeCode("Deux `` collés")).toEqual([{ code: false, texte: "Deux `` collés" }]);
  });

  it("ne rend jamais de morceau vide", () => {
    expect(segmentsDeCode("")).toEqual([]);
    expect(segmentsDeCode("`a`").every((segment) => segment.texte.length > 0)).toBe(true);
  });

  it("ne laisse jamais deux morceaux de prose voisins", () => {
    fc.assert(
      fc.property(
        fc.string({ maxLength: 60, unit: fc.constantFrom("a", " ", "`", ".") }),
        (texte) => {
          const segments = segmentsDeCode(texte);

          segments.forEach((segment, index) => {
            const suivant = segments[index + 1];
            expect(segment.code || suivant?.code !== false).toBe(true);
          });
        },
      ),
      { numRuns: 200 },
    );
  });

  /**
   * La propriété qui protège le dépôt : rien de ce qui a été écrit ne
   * disparaît. Seuls les accents graves d'une paire pleine sont consommés, et
   * le texte se reconstruit à l'identique en les remettant.
   */
  it("se recompose à l'identique", () => {
    fc.assert(
      fc.property(
        fc.string({ maxLength: 80, unit: fc.constantFrom("x", " ", "`", "(", ")") }),
        (texte) => {
          const recompose = segmentsDeCode(texte)
            .map((segment) => (segment.code ? `\`${segment.texte}\`` : segment.texte))
            .join("");

          expect(recompose).toBe(texte);
        },
      ),
      { numRuns: 300 },
    );
  });
});
