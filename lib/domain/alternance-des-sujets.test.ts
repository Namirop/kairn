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

describe("le geste départage, sans défaire les sujets", () => {
  /** Un concept réduit à ce qui compte ici : son sujet et son geste. */
  const concept = (sujet: string, geste: string, id: string) => ({
    tags: [sujet],
    inputId: id,
    geste,
  });
  const geste = (item: { geste: string }) => item.geste;

  it("préfère le sujet qui change aussi de geste", () => {
    // Trois sujets d'un concept chacun : l'alternance des sujets seule prendrait
    // « deux » en second et répéterait le geste. Le départage prend « trois ».
    const concepts = [
      concept("un", "CHOISIR", "a"),
      concept("deux", "CHOISIR", "b"),
      concept("trois", "SAISIR", "c"),
    ];

    expect(alternerLesSujets(concepts, geste).map((item) => item.inputId)).toEqual(["a", "c", "b"]);
    // Sans lui, le geste se répétait dès le deuxième.
    expect(alternerLesSujets(concepts).map((item) => item.inputId)).toEqual(["a", "b", "c"]);
  });

  it("ne cherche pas plus loin que la tête de chaque sujet", () => {
    // Deux sujets qui portent chacun les deux gestes : l'alternance parfaite
    // demanderait de servir un concept moins urgent avant un plus urgent du même
    // sujet. L'ordre d'urgence n'est pas une préférence d'affichage — il gagne, et
    // un geste se répète.
    const concepts = [
      concept("un", "CHOISIR", "a"),
      concept("un", "SAISIR", "b"),
      concept("deux", "CHOISIR", "c"),
      concept("deux", "SAISIR", "d"),
    ];

    expect(alternerLesSujets(concepts, geste).map((item) => item.inputId)).toEqual([
      "a",
      "c",
      "b",
      "d",
    ]);
  });

  it("garde l'alternance des sujets quand les deux critères s'opposent", () => {
    // Le seul concept d'un autre geste appartient au sujet qu'on vient de servir :
    // c'est le sujet qui gagne, et le geste se répète.
    const concepts = [
      concept("un", "CHOISIR", "a"),
      concept("un", "SAISIR", "b"),
      concept("deux", "CHOISIR", "c"),
    ];

    const sujets = alternerLesSujets(concepts, geste).map((item) => item.tags[0]);

    expect(sujets.every((sujet, rang) => rang === 0 || sujet !== sujets[rang - 1])).toBe(true);
  });

  it("sans accesseur de geste, l'ordre est celui des sujets seuls", () => {
    const concepts = [
      concept("un", "CHOISIR", "a"),
      concept("un", "SAISIR", "b"),
      concept("deux", "CHOISIR", "c"),
      concept("deux", "SAISIR", "d"),
    ];

    expect(alternerLesSujets(concepts).map((item) => item.inputId)).toEqual(
      alternerLesSujets(concepts).map((item) => item.inputId),
    );
  });

  it("ne perd ni n'invente rien, quel que soit le geste", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            sujet: fc.constantFrom("un", "deux", "trois"),
            geste: fc.constantFrom("CHOISIR", "SAISIR", "FORMULER"),
          }),
          { maxLength: 25 },
        ),
        (tirage) => {
          const concepts = tirage.map((entree, rang) =>
            concept(entree.sujet, entree.geste, `c${rang}`),
          );
          const ordonnes = alternerLesSujets(concepts, geste);

          return (
            ordonnes.length === concepts.length &&
            new Set(ordonnes.map((item) => item.inputId)).size === concepts.length
          );
        },
      ),
      { numRuns: 300 },
    );
  });
});
