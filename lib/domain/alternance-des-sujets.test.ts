import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { alternerLesSujets, type ConceptAAlterner } from "./alternance-des-sujets";

function concept(
  id: string,
  tags: string[] = [],
  inputId = "depot",
): ConceptAAlterner & { id: string } {
  return { id, tags, inputId };
}

describe("alternerLesSujets", () => {
  it("ne sert jamais deux fois le même sujet d'affilée quand un autre attend", () => {
    const concepts = [
      concept("a1", ["postgres"]),
      concept("a2", ["postgres"]),
      concept("a3", ["postgres"]),
      concept("b1", ["react"]),
      concept("b2", ["react"]),
    ];

    const sujets = alternerLesSujets(concepts).map((c) => c.tags[0]);

    expect(sujets).toEqual(["postgres", "react", "postgres", "react", "postgres"]);
  });

  it("répète le sujet restant plutôt que de tronquer la session", () => {
    const concepts = [
      concept("a1", ["postgres"]),
      concept("a2", ["postgres"]),
      concept("a3", ["postgres"]),
      concept("b1", ["react"]),
    ];

    const ordonnes = alternerLesSujets(concepts);

    expect(ordonnes).toHaveLength(4);
    expect(new Set(ordonnes.map((c) => c.id)).size).toBe(4);
  });

  it("retombe sur le dépôt quand le concept n'a pas de tag", () => {
    const concepts = [
      concept("a1", [], "depot-1"),
      concept("a2", [], "depot-1"),
      concept("b1", [], "depot-2"),
    ];

    expect(alternerLesSujets(concepts).map((c) => c.inputId)).toEqual([
      "depot-1",
      "depot-2",
      "depot-1",
    ]);
  });

  it("rend le même ordre pour la même entrée", () => {
    const concepts = [
      concept("a1", ["postgres"]),
      concept("b1", ["react"]),
      concept("c1", ["http"]),
      concept("a2", ["postgres"]),
    ];

    expect(alternerLesSujets([...concepts])).toEqual(alternerLesSujets([...concepts]));
  });

  it("ne perd ni ne duplique aucun concept", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.string({ minLength: 1, maxLength: 6 }),
            sujet: fc.constantFrom("a", "b", "c", "d"),
          }),
          { maxLength: 40 },
        ),
        (entrees) => {
          const concepts = entrees.map((entree, rang) =>
            concept(`${entree.id}-${rang}`, [entree.sujet]),
          );
          const ordonnes = alternerLesSujets(concepts);

          return (
            ordonnes.length === concepts.length &&
            new Set(ordonnes.map((c) => c.id)).size === concepts.length
          );
        },
      ),
      { numRuns: 300 },
    );
  });

  it("n'accole deux fois un sujet que lorsqu'il ne reste que lui", () => {
    fc.assert(
      fc.property(fc.array(fc.constantFrom("a", "b", "c"), { maxLength: 30 }), (sujets) => {
        const concepts = sujets.map((s, rang) => concept(`${s}-${rang}`, [s]));
        const ordonnes = alternerLesSujets(concepts);

        for (let rang = 1; rang < ordonnes.length; rang += 1) {
          const precedent = ordonnes[rang - 1]?.tags[0];
          const courant = ordonnes[rang]?.tags[0];

          if (precedent !== courant) continue;

          // Accolés : il faut qu'aucun autre sujet n'ait attendu son tour.
          const restants = ordonnes.slice(rang).map((c) => c.tags[0]);
          if (new Set(restants).size > 1) return false;
        }

        return true;
      }),
      { numRuns: 300 },
    );
  });
});
