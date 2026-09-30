import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { segmentsEnGras } from "./texte-en-gras";

describe("segmentsEnGras", () => {
  it("rend un texte sans marqueur en un seul morceau", () => {
    expect(segmentsEnGras("Le dossier android sert d’hôte.")).toEqual([
      { gras: false, texte: "Le dossier android sert d’hôte." },
    ]);
  });

  /** Le cas du dépôt de production : « **En bref** — Le dossier… ». */
  it("relève ce qui est entre deux paires d’astérisques", () => {
    expect(segmentsEnGras("**En bref** — un projet natif.")).toEqual([
      { gras: true, texte: "En bref" },
      { gras: false, texte: " — un projet natif." },
    ]);
  });

  it("relève plusieurs passages d’une même ligne", () => {
    expect(segmentsEnGras("un **deux** trois **quatre**")).toEqual([
      { gras: false, texte: "un " },
      { gras: true, texte: "deux" },
      { gras: false, texte: " trois " },
      { gras: true, texte: "quatre" },
    ]);
  });

  /** Une paire isolée est le plus souvent une multiplication. */
  it("laisse une paire qui ne se referme pas", () => {
    expect(segmentsEnGras("2**3 vaut huit")).toEqual([{ gras: false, texte: "2**3 vaut huit" }]);
  });

  it("laisse une paire vide telle quelle", () => {
    expect(segmentsEnGras("un **** deux")).toEqual([{ gras: false, texte: "un **** deux" }]);
  });

  it("ne relève pas un astérisque seul, qui ouvre souvent une puce", () => {
    expect(segmentsEnGras("* une entrée *de liste*")).toEqual([
      { gras: false, texte: "* une entrée *de liste*" },
    ]);
  });

  it("rend exactement le texte reçu, marqueurs relevés retirés", () => {
    fc.assert(
      fc.property(fc.string(), (texte) => {
        const rendu = segmentsEnGras(texte)
          .map((segment) => (segment.gras ? `**${segment.texte}**` : segment.texte))
          .join("");

        expect(rendu).toBe(texte);
      }),
      { numRuns: 500 },
    );
  });

  it("ne rend jamais deux parties ordinaires voisines", () => {
    fc.assert(
      fc.property(fc.string(), (texte) => {
        const segments = segmentsEnGras(texte);

        return segments.every(
          (segment, rang) => rang === 0 || segment.gras || segments[rang - 1]?.gras === true,
        );
      }),
      { numRuns: 300 },
    );
  });
});
