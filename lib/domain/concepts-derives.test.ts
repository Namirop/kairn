import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { ecarterLesDerives } from "./concepts-derives";

const concept = (nom: string, deriveDe: number | null = null) => ({ nom, deriveDe });

describe("ecarterLesDerives", () => {
  it("garde les concepts qui tiennent seuls", () => {
    const { gardes, ecartes } = ecarterLesDerives([concept("un"), concept("deux")]);

    expect(gardes.map((garde) => garde.nom)).toEqual(["un", "deux"]);
    expect(ecartes).toBe(0);
  });

  it("écarte un concept qui découle d'un autre", () => {
    // Le cas de `16-concepts-imbriques` : deux exemples rattachés à leur règle.
    const { gardes, ecartes } = ecarterLesDerives([
      concept("le fond épais supprime le point brûlant"),
      concept("une sauce attache au centre d'une casserole bon marché", 1),
      concept("le fond épais met plus de temps à refroidir"),
      concept("une sauce retirée du feu continue de cuire", 3),
    ]);

    expect(gardes.map((garde) => garde.nom)).toEqual([
      "le fond épais supprime le point brûlant",
      "le fond épais met plus de temps à refroidir",
    ]);
    expect(ecartes).toBe(2);
  });

  it("conserve l'ordre d'importance rendu par le modèle", () => {
    const { gardes } = ecarterLesDerives([
      concept("un"),
      concept("deux", 1),
      concept("trois"),
      concept("quatre"),
    ]);

    expect(gardes.map((garde) => garde.nom)).toEqual(["un", "trois", "quatre"]);
  });

  it("garde un concept qui se désigne lui-même", () => {
    const { gardes, ecartes } = ecarterLesDerives([concept("un", 1), concept("deux")]);

    expect(gardes).toHaveLength(2);
    expect(ecartes).toBe(0);
  });

  it("garde un concept dont le renvoi sort de la liste", () => {
    const { gardes } = ecarterLesDerives([concept("un", 9), concept("deux", 0), concept("trois")]);

    expect(gardes).toHaveLength(3);
  });

  it("ne vide jamais un envoi, même si tout se déclare dérivé", () => {
    // Un cycle. Écarter les deux perdrait le dépôt entier sur une relation mal
    // décrite — exactement ce que le plafond de douze faisait.
    const { gardes, ecartes } = ecarterLesDerives([concept("un", 2), concept("deux", 1)]);

    expect(gardes).toHaveLength(2);
    expect(ecartes).toBe(0);
  });

  it("rend une liste vide sur une entrée vide", () => {
    expect(ecarterLesDerives([])).toEqual({ gardes: [], ecartes: 0 });
  });

  it("garde toujours au moins un concept, et jamais plus qu'il n'en est entré", () => {
    fc.assert(
      fc.property(
        fc.array(fc.record({ deriveDe: fc.option(fc.integer({ min: -3, max: 25 })) }), {
          minLength: 1,
          maxLength: 25,
        }),
        (concepts) => {
          const { gardes, ecartes } = ecarterLesDerives(concepts);

          expect(gardes.length).toBeGreaterThan(0);
          expect(gardes.length).toBeLessThanOrEqual(concepts.length);
          expect(ecartes).toBe(
            gardes.length === concepts.length ? 0 : concepts.length - gardes.length,
          );
        },
      ),
    );
  });
});
