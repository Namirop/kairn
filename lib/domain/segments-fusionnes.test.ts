import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { fusionnerLaProse, type MorceauMarque } from "./segments-fusionnes";

const morceaux = fc.array(fc.record({ marque: fc.boolean(), texte: fc.string({ maxLength: 4 }) }));

describe("fusionnerLaProse", () => {
  it("fusionne la prose voisine et ignore les vides", () => {
    expect(
      fusionnerLaProse([
        { marque: false, texte: "Un " },
        { marque: false, texte: "" },
        { marque: false, texte: "texte " },
        { marque: true, texte: "code" },
        { marque: false, texte: "." },
      ]),
    ).toEqual([
      { marque: false, texte: "Un texte " },
      { marque: true, texte: "code" },
      { marque: false, texte: "." },
    ]);
  });

  it("garde séparées deux parties marquées voisines", () => {
    expect(
      fusionnerLaProse([
        { marque: true, texte: "a" },
        { marque: true, texte: "b" },
      ]),
    ).toEqual([
      { marque: true, texte: "a" },
      { marque: true, texte: "b" },
    ]);
  });

  it("rend une liste vide pour des morceaux tous vides", () => {
    expect(
      fusionnerLaProse([
        { marque: false, texte: "" },
        { marque: true, texte: "" },
      ]),
    ).toEqual([]);
  });

  it("ne modifie pas les morceaux reçus", () => {
    const recus: MorceauMarque[] = [
      { marque: false, texte: "a" },
      { marque: false, texte: "b" },
    ];

    fusionnerLaProse(recus);

    expect(recus).toEqual([
      { marque: false, texte: "a" },
      { marque: false, texte: "b" },
    ]);
  });

  it("conserve le texte, ne laisse aucun vide ni deux proses voisines", () => {
    fc.assert(
      fc.property(morceaux, (entree) => {
        const sortie = fusionnerLaProse(entree);

        expect(sortie.map((m) => m.texte).join("")).toBe(entree.map((m) => m.texte).join(""));
        expect(sortie.every((m) => m.texte.length > 0)).toBe(true);
        expect(sortie.some((m, rang) => !m.marque && sortie[rang + 1]?.marque === false)).toBe(
          false,
        );
      }),
    );
  });

  it("garde les parties marquées non vides, dans l'ordre", () => {
    fc.assert(
      fc.property(morceaux, (entree) => {
        const marques = (liste: readonly MorceauMarque[]): string[] =>
          liste.filter((m) => m.marque && m.texte.length > 0).map((m) => m.texte);

        expect(marques(fusionnerLaProse(entree))).toEqual(marques(entree));
      }),
    );
  });

  it("est idempotente", () => {
    fc.assert(
      fc.property(morceaux, (entree) => {
        const une = fusionnerLaProse(entree);

        expect(fusionnerLaProse(une)).toEqual(une);
      }),
    );
  });
});
