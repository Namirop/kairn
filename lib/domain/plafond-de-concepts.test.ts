import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { appliquerLePlafond, PLAFOND_CONCEPTS_PAR_DEPOT } from "./plafond-de-concepts";

const concepts = (combien: number) => Array.from({ length: combien }, (_, rang) => rang);

describe("appliquerLePlafond", () => {
  it("laisse passer une liste sous le plafond", () => {
    const applique = appliquerLePlafond(concepts(5));

    expect(applique.gardes).toHaveLength(5);
    expect(applique.rendus).toBe(5);
    expect(applique.tronque).toBe(false);
  });

  it("ne tronque pas une liste posée exactement sur le plafond", () => {
    const applique = appliquerLePlafond(concepts(PLAFOND_CONCEPTS_PAR_DEPOT));

    expect(applique.gardes).toHaveLength(PLAFOND_CONCEPTS_PAR_DEPOT);
    expect(applique.tronque).toBe(false);
  });

  it("coupe au plafond et se souvient de ce qui avait été rendu", () => {
    const applique = appliquerLePlafond(concepts(25));

    expect(applique.gardes).toHaveLength(PLAFOND_CONCEPTS_PAR_DEPOT);
    expect(applique.rendus).toBe(25);
    expect(applique.tronque).toBe(true);
  });

  it("garde la tête de la liste, puisque c'est elle qui est la plus importante", () => {
    expect(appliquerLePlafond(concepts(25)).gardes).toEqual(concepts(PLAFOND_CONCEPTS_PAR_DEPOT));
  });

  it("rend une liste vide sans rien inventer", () => {
    expect(appliquerLePlafond([])).toEqual({ gardes: [], rendus: 0, tronque: false });
  });

  it("ne rend jamais plus que le plafond, ni plus que ce qu'on lui donne", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer(), { maxLength: 60 }),
        fc.integer({ min: 1, max: 40 }),
        (liste, plafond) => {
          const applique = appliquerLePlafond(liste, plafond);

          expect(applique.gardes.length).toBeLessThanOrEqual(plafond);
          expect(applique.gardes.length).toBeLessThanOrEqual(liste.length);
          expect(applique.rendus).toBe(liste.length);
          expect(applique.tronque).toBe(liste.length > plafond);
        },
      ),
    );
  });

  it("est un préfixe de ce qu'on lui donne : rien n'est réordonné", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer(), { maxLength: 60 }),
        fc.integer({ min: 1, max: 40 }),
        (liste, plafond) => {
          const { gardes } = appliquerLePlafond(liste, plafond);

          expect(gardes).toEqual(liste.slice(0, gardes.length));
        },
      ),
    );
  });
});
