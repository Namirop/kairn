import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { scinderLeGroupe } from "./scission-de-groupe";

const GROUPE = fc.array(fc.string({ minLength: 1 }), { minLength: 2, maxLength: 12 });

describe("scinderLeGroupe", () => {
  it("ne coupe pas un groupe vide", () => {
    expect(scinderLeGroupe([])).toBeNull();
  });

  it("ne coupe pas un concept seul : c'est un échec, pas un groupe trop gros", () => {
    expect(scinderLeGroupe(["a"])).toBeNull();
  });

  it("coupe un groupe de deux en un et un", () => {
    expect(scinderLeGroupe(["a", "b"])).toEqual({ garde: ["a"], reporte: ["b"] });
  });

  it("laisse le concept de plus au job déjà là", () => {
    expect(scinderLeGroupe(["a", "b", "c"])).toEqual({ garde: ["a", "b"], reporte: ["c"] });
  });

  it("ne perd et ne réordonne aucun concept", () => {
    fc.assert(
      fc.property(GROUPE, (atomIds) => {
        const coupe = scinderLeGroupe(atomIds);

        expect(coupe).not.toBeNull();
        expect([...(coupe?.garde ?? []), ...(coupe?.reporte ?? [])]).toEqual(atomIds);
      }),
    );
  });

  it("rend deux moitiés non vides, dont une strictement plus courte que le groupe", () => {
    fc.assert(
      fc.property(GROUPE, (atomIds) => {
        const coupe = scinderLeGroupe(atomIds);

        expect(coupe?.garde.length).toBeGreaterThan(0);
        expect(coupe?.reporte.length).toBeGreaterThan(0);
        // C'est cette décroissance qui fait converger la reprise : sans elle,
        // un groupe se recouperait à l'identique jusqu'à épuiser ses essais.
        expect(coupe?.garde.length).toBeLessThan(atomIds.length);
      }),
    );
  });

  it("recoupé jusqu'au bout, un groupe finit en concepts seuls", () => {
    fc.assert(
      fc.property(GROUPE, (atomIds) => {
        let garde = atomIds;
        let tours = 0;

        for (let coupe = scinderLeGroupe(garde); coupe !== null; coupe = scinderLeGroupe(garde)) {
          garde = coupe.garde;
          tours += 1;
          expect(tours).toBeLessThanOrEqual(atomIds.length);
        }

        expect(garde).toHaveLength(1);
      }),
    );
  });
});
