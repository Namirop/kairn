import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { compterLesDerives } from "./concepts-derives";

const concept = (deriveDe: number | null = null) => ({ deriveDe });

describe("compterLesDerives", () => {
  it("ne compte rien quand tous les concepts tiennent seuls", () => {
    expect(compterLesDerives([concept(), concept()])).toBe(0);
  });

  it("compte les concepts qui découlent d'un autre", () => {
    // Le cas de `16-concepts-imbriques` : deux exemples rattachés à leur règle.
    expect(compterLesDerives([concept(), concept(1), concept(), concept(3)])).toBe(2);
  });

  it("ne compte pas un concept qui se désigne lui-même", () => {
    expect(compterLesDerives([concept(1), concept()])).toBe(0);
  });

  it("ne compte pas un renvoi hors de la liste", () => {
    expect(compterLesDerives([concept(9), concept(0), concept()])).toBe(0);
  });

  it("compte tout le monde si tout le monde se déclare dérivé", () => {
    // Plus rien n'est écarté : la mesure dit ce qu'elle voit, et c'est au
    // contrôle du banc de trouver ça suspect.
    expect(compterLesDerives([concept(2), concept(1)])).toBe(2);
  });

  it("rend zéro sur une entrée vide", () => {
    expect(compterLesDerives([])).toBe(0);
  });

  it("ne compte jamais plus de concepts qu'il n'en est entré", () => {
    fc.assert(
      fc.property(
        fc.array(fc.record({ deriveDe: fc.option(fc.integer({ min: -3, max: 25 })) }), {
          maxLength: 25,
        }),
        (concepts) => {
          const derives = compterLesDerives(concepts);

          expect(derives).toBeGreaterThanOrEqual(0);
          expect(derives).toBeLessThanOrEqual(concepts.length);
        },
      ),
    );
  });
});
