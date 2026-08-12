import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { EXEMPLES_DE_DEPOT, INVITES_DE_DEPOT, inviteDeDepot } from "./invites-de-depot";

describe("inviteDeDepot", () => {
  it("rend la première invite au tirage nul et la dernière au tirage haut", () => {
    expect(inviteDeDepot(0)).toBe(INVITES_DE_DEPOT[0]);
    expect(inviteDeDepot(0.999)).toBe(INVITES_DE_DEPOT[INVITES_DE_DEPOT.length - 1]);
  });

  /** `Math.random()` rend [0, 1) : le 1 exclu ne doit pas sortir du tableau. */
  it("ne sort jamais du tableau, même aux bornes et au-delà", () => {
    fc.assert(
      fc.property(fc.double({ min: -2, max: 3, noNaN: true }), (tirage) =>
        INVITES_DE_DEPOT.includes(inviteDeDepot(tirage)),
      ),
      { numRuns: 500 },
    );
  });

  it("rend la même invite pour le même tirage", () => {
    expect(inviteDeDepot(0.42)).toBe(inviteDeDepot(0.42));
  });

  it("couvre toutes les invites sur l'intervalle", () => {
    const tirees = new Set(Array.from({ length: 400 }, (_, rang) => inviteDeDepot(rang / 400)));

    expect(tirees.size).toBe(INVITES_DE_DEPOT.length);
  });
});

describe("EXEMPLES_DE_DEPOT", () => {
  /**
   * Le message passe par le contraste : trois exemples de trois natures. Deux
   * suffiraient à faire une paire, et une paire se lit comme une catégorie.
   */
  it("propose trois exemples distincts", () => {
    expect(EXEMPLES_DE_DEPOT).toHaveLength(3);
    expect(new Set(EXEMPLES_DE_DEPOT.map((exemple) => exemple.texte)).size).toBe(3);
  });

  it("porte du vrai contenu, assez long pour donner un concept", () => {
    for (const exemple of EXEMPLES_DE_DEPOT) {
      expect(exemple.texte.length).toBeGreaterThan(80);
      expect(exemple.etiquette.length).toBeLessThan(40);
    }
  });
});
