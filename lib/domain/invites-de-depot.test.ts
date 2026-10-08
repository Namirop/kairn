import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { EXEMPLES_DE_DEPOT, INVITES_DE_DEPOT, inviteDeDepot } from "./invites-de-depot";
import type { LangueDuProduit } from "./langue-du-produit";

const LANGUES: LangueDuProduit[] = ["FR", "EN"];

describe.each(LANGUES)("inviteDeDepot, en %s", (langue) => {
  const invites = INVITES_DE_DEPOT[langue];

  it("rend la première invite au tirage nul et la dernière au tirage haut", () => {
    expect(inviteDeDepot(0, langue)).toBe(invites[0]);
    expect(inviteDeDepot(0.999, langue)).toBe(invites[invites.length - 1]);
  });

  /** `Math.random()` rend [0, 1) : le 1 exclu ne doit pas sortir du tableau. */
  it("ne sort jamais du tableau, même aux bornes et au-delà", () => {
    fc.assert(
      fc.property(fc.double({ min: -2, max: 3, noNaN: true }), (tirage) =>
        invites.includes(inviteDeDepot(tirage, langue)),
      ),
      { numRuns: 500 },
    );
  });

  it("rend la même invite pour le même tirage", () => {
    expect(inviteDeDepot(0.42, langue)).toBe(inviteDeDepot(0.42, langue));
  });

  it("couvre toutes les invites sur l'intervalle", () => {
    const tirees = new Set(
      Array.from({ length: 400 }, (_, rang) => inviteDeDepot(rang / 400, langue)),
    );

    expect(tirees.size).toBe(invites.length);
  });
});

describe.each(LANGUES)("EXEMPLES_DE_DEPOT, en %s", (langue) => {
  const exemples = EXEMPLES_DE_DEPOT[langue];

  /**
   * Le message passe par le contraste : trois exemples de trois natures. Deux
   * suffiraient à faire une paire, et une paire se lit comme une catégorie.
   */
  it("propose trois exemples distincts", () => {
    expect(exemples).toHaveLength(3);
    expect(new Set(exemples.map((exemple) => exemple.texte)).size).toBe(3);
  });

  it("porte du vrai contenu, assez long pour donner un concept", () => {
    for (const exemple of exemples) {
      expect(exemple.texte.length).toBeGreaterThan(80);
      expect(exemple.etiquette.length).toBeLessThan(40);
    }
  });
});

describe("les deux langues", () => {
  it("proposent autant d'exemples l'une que l'autre", () => {
    expect(EXEMPLES_DE_DEPOT.EN).toHaveLength(EXEMPLES_DE_DEPOT.FR.length);
  });

  it("ne se partagent aucune invite : l'une n'est pas l'autre restée telle quelle", () => {
    const francaises = new Set(INVITES_DE_DEPOT.FR);

    expect(INVITES_DE_DEPOT.EN.some((invite) => francaises.has(invite))).toBe(false);
  });
});
