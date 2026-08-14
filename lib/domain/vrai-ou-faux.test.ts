import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { cibleDuVraiOuFaux, ciblesDuLot, FACETTES_DU_VRAI_OU_FAUX } from "./vrai-ou-faux";

/**
 * Ce qui compte ici est une propriété de distribution — c'est tout l'objet du
 * correctif. Un exemple ne la prouve pas : on tire sur mille identifiants.
 */

const TIRAGES = 1000;

/** Trois écarts-types d'une binomiale(1000, 0,5) : ~47,4. */
const MARGE = 48;

describe("cibleDuVraiOuFaux", () => {
  it("répartit les cibles à peu près moitié-moitié sur mille identifiants", () => {
    const vraies = Array.from({ length: TIRAGES }, (_, rang) =>
      cibleDuVraiOuFaux(`atome-${rang}:BOUNDARY`),
    ).filter(Boolean).length;

    expect(vraies).toBeGreaterThan(TIRAGES / 2 - MARGE);
    expect(vraies).toBeLessThan(TIRAGES / 2 + MARGE);
  });

  it("tient aussi sur des identifiants qui ne se suivent pas", () => {
    const vraies = Array.from({ length: TIRAGES }, (_, rang) =>
      cibleDuVraiOuFaux(`${(rang * 7919).toString(36)}-cmg${rang}:RECOGNITION`),
    ).filter(Boolean).length;

    expect(vraies).toBeGreaterThan(TIRAGES / 2 - MARGE);
    expect(vraies).toBeLessThan(TIRAGES / 2 + MARGE);
  });

  it("rend toujours la même cible pour la même graine", () => {
    fc.assert(
      fc.property(fc.string(), (graine) => {
        expect(cibleDuVraiOuFaux(graine)).toBe(cibleDuVraiOuFaux(graine));
      }),
    );
  });
});

describe("ciblesDuLot", () => {
  it("donne une cible à chaque facette qui peut porter un vrai ou faux", () => {
    expect(ciblesDuLot("atome").map((cible) => cible.facette)).toEqual([
      ...FACETTES_DU_VRAI_OU_FAUX,
    ]);
  });

  it("tire chaque facette indépendamment des autres", () => {
    // Sur mille concepts, trois facettes qui suivraient le même tirage
    // donneraient mille lots uniformes. C'est le défaut que la graine par
    // facette existe pour éviter.
    const uniformes = Array.from({ length: TIRAGES }, (_, rang) =>
      ciblesDuLot(`atome-${rang}`).map((cible) => cible.vraie),
    ).filter((lot) => new Set(lot).size === 1).length;

    // Un quart des lots est uniforme quand les tirages sont indépendants.
    expect(uniformes).toBeGreaterThan(TIRAGES / 8);
    expect(uniformes).toBeLessThan(TIRAGES / 2);
  });

  it("ne change pas d'un appel à l'autre", () => {
    fc.assert(
      fc.property(fc.string(), (graine) => {
        expect(ciblesDuLot(graine)).toEqual(ciblesDuLot(graine));
      }),
    );
  });
});
