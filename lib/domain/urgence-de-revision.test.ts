import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { retardRelatif, type ConceptAOublier } from "./urgence-de-revision";

const JOUR_MS = 24 * 60 * 60 * 1000;

/** Un concept jamais revu : aucun intervalle ne lui a été promis. */
function neuf(id: string): ConceptAOublier {
  return { id, lastReview: null, scheduledDays: 0 };
}

/** Un concept revu, décrit par l'intervalle promis et le retard pris dessus. */
function revu(
  id: string,
  maintenant: string,
  intervalleJours: number,
  retardJours: number,
): ConceptAOublier {
  const echeance = new Date(maintenant).getTime() - retardJours * JOUR_MS;

  return {
    id,
    lastReview: new Date(echeance - intervalleJours * JOUR_MS),
    scheduledDays: intervalleJours,
  };
}

describe("retardRelatif", () => {
  const maintenant = new Date("2026-01-15T09:00:00Z");

  it("rend les ratios de l'exemple : deux fois l'intervalle contre un peu plus d'une", () => {
    expect(retardRelatif(revu("court", maintenant.toISOString(), 3, 3), maintenant)).toBeCloseTo(2);
    expect(retardRelatif(revu("long", maintenant.toISOString(), 90, 3), maintenant)).toBeCloseTo(
      1.033,
      3,
    );
  });

  it("rend un pour un concept revu pile à son échéance", () => {
    expect(retardRelatif(revu("pile", maintenant.toISOString(), 12, 0), maintenant)).toBeCloseTo(1);
  });

  it("met un concept jamais revu au-dessus de tout", () => {
    const jamaisRevu = neuf("neuf");

    expect(retardRelatif(jamaisRevu, maintenant)).toBe(Number.POSITIVE_INFINITY);
    expect(
      retardRelatif(revu("vieux", maintenant.toISOString(), 1, 3650), maintenant),
    ).toBeLessThan(retardRelatif(jamaisRevu, maintenant));
  });

  it("plafonne l'intervalle par le bas plutôt que de diviser par zéro", () => {
    const enApprentissage: ConceptAOublier = {
      id: "appris",
      lastReview: new Date("2026-01-14T09:00:00Z"),
      scheduledDays: 0,
    };

    expect(retardRelatif(enApprentissage, maintenant)).toBeCloseTo(1);
  });

  it("croît avec le retard, à intervalle promis égal", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 365 }),
        fc.integer({ min: 0, max: 200 }),
        (intervalle, retard) => {
          const instant = maintenant.toISOString();
          const base = retardRelatif(revu("a", instant, intervalle, retard), maintenant);
          const plusEnRetard = retardRelatif(
            revu("b", instant, intervalle, retard + 1),
            maintenant,
          );

          return plusEnRetard > base;
        },
      ),
      { numRuns: 300 },
    );
  });

  /**
   * Un intervalle plus long absorbe le même retard : c'est toute la thèse du
   * tri. L'égalité au retard nul n'est pas une exception à ranger — un concept
   * revu pile à l'heure vaut un, quel que soit l'intervalle qu'il tenait, et
   * c'est exactement ce qu'on veut dire.
   */
  it("décroît quand l'intervalle promis s'allonge, dès qu'il y a du retard", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 365 }),
        fc.integer({ min: 0, max: 200 }),
        (intervalle, retard) => {
          const instant = maintenant.toISOString();
          const base = retardRelatif(revu("a", instant, intervalle, retard), maintenant);
          const plusSolide = retardRelatif(revu("c", instant, intervalle + 1, retard), maintenant);

          return retard === 0 ? plusSolide === base : plusSolide < base;
        },
      ),
      { numRuns: 300 },
    );
  });
});
